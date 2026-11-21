import { createHash, createHmac, randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Controller, Get, HttpException, HttpStatus, NotFoundException, Param, Post, Req, UseGuards, Body, ForbiddenException } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { FileObject, ALLOWED_MIME } from "../domain/file-object";

type StorageConfig = { endpoint: URL; bucket: string; accessKey: string; secretKey: string; region: string };
type FileRow = { id: string; owner_id: string; mime_type: string; size_bytes: string | number; status: string; document_of: string | null; storage_key: string | null };

function encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, char => "%" + char.charCodeAt(0).toString(16).toUpperCase()).replace(/%7E/g,"~");
}
function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function hmac(key: Buffer | string, value: string): Buffer { return createHmac("sha256",key).update(value).digest(); }

function storageConfig(): StorageConfig | null {
  const endpointValue=process.env.STORAGE_ENDPOINT;
  const bucket=process.env.STORAGE_BUCKET;
  const accessKey=process.env.STORAGE_ACCESS_KEY;
  const secretKey=process.env.STORAGE_SECRET_KEY;
  if(!endpointValue||!bucket||!accessKey||!secretKey)return null;
  const endpoint=new URL(endpointValue);
  if(endpoint.protocol!=="https:")throw new Error("STORAGE_ENDPOINT must use HTTPS");
  return {endpoint,bucket,accessKey,secretKey,region:process.env.STORAGE_REGION??"auto"};
}

/** AWS Signature V4 presigning for S3-compatible PUT/GET/HEAD requests. */
function presign(config:StorageConfig,method:"PUT"|"GET"|"HEAD",key:string,expires:number,contentType?:string):string {
  const now=new Date();
  const amzDate=now.toISOString().replace(/[:-]|\.\d{3}/g,"");
  const dateStamp=amzDate.slice(0,8);
  const scope=dateStamp+"/"+config.region+"/s3/aws4_request";
  const prefix=config.endpoint.pathname.replace(/\/+$/,"");
  const keyPath=key.split("/").map(encode).join("/");
  const canonicalUri=prefix+"/"+encode(config.bucket)+"/"+keyPath;
  const url=new URL(config.endpoint.toString());
  url.pathname=canonicalUri;
  const host=url.host;
  const signedHeaders=contentType?"content-type;host":"host";
  const canonicalHeaders=contentType?"content-type:"+contentType+"\nhost:"+host+"\n":"host:"+host+"\n";
  const query:Record<string,string>={
    "X-Amz-Algorithm":"AWS4-HMAC-SHA256",
    "X-Amz-Credential":config.accessKey+"/"+scope,
    "X-Amz-Date":amzDate,
    "X-Amz-Expires":String(expires),
    "X-Amz-SignedHeaders":signedHeaders,
  };
  const canonicalQuery=Object.keys(query).sort().map(k=>encode(k)+"="+encode(query[k]!)).join("&");
  const canonicalRequest=[method,canonicalUri,canonicalQuery,canonicalHeaders,signedHeaders,"UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign=["AWS4-HMAC-SHA256",amzDate,scope,sha256(canonicalRequest)].join("\n");
  const kDate=hmac("AWS4"+config.secretKey,dateStamp);
  const kRegion=hmac(kDate,config.region);
  const kService=hmac(kRegion,"s3");
  const kSigning=hmac(kService,"aws4_request");
  const signature=createHmac("sha256",kSigning).update(stringToSign).digest("hex");
  url.search=canonicalQuery+"&X-Amz-Signature="+signature;
  return url.toString();
}

@Controller("files")
@UseGuards(AuthGuard)
export class FilesController {
  constructor(private readonly db:DatabaseService) {}

  @Post("intents")
  async createIntent(@Req() req:{userId:string},@Body() body:{mimeType:string;sizeBytes:number;documentOf?:string}) {
    if(!body?.mimeType||!ALLOWED_MIME.includes(body.mimeType))throw new BadRequestException("file MIME type is not allowed");
    let file:FileObject;
    try{file=new FileObject("file_"+randomUUID(),req.userId,body.mimeType,body.sizeBytes,"upload_intent",body.documentOf);}
    catch(e){throw new BadRequestException((e as Error).message)}
    let config:StorageConfig|null;
    try{config=storageConfig()}catch{throw new HttpException("object storage configuration is invalid",HttpStatus.SERVICE_UNAVAILABLE)}
    if(!config)throw new HttpException("private object storage is not configured",HttpStatus.SERVICE_UNAVAILABLE);
    const key="users/"+req.userId+"/"+randomUUID();
    await this.db.query(
      "INSERT INTO file_objects (id,owner_id,mime_type,size_bytes,status,document_of,storage_key) VALUES ($1,$2,$3,$4,'upload_intent',$5,$6)",
      [file.id,req.userId,file.mimeType,file.sizeBytes,file.documentOf??null,key]
    );
    return {fileId:file.id,uploadUrl:presign(config,"PUT",key,300,file.mimeType),requiredHeaders:{"Content-Type":file.mimeType},expiresInSeconds:300};
  }

  @Post(":id/complete")
  async complete(@Param("id") id:string,@Req() req:{userId:string}) {
    const row=await this.ownedFile(id,req.userId);
    if(row.status!=="upload_intent"||!row.storage_key)throw new ConflictException("file is not awaiting upload");
    const config=storageConfig();
    if(!config)throw new HttpException("private object storage is not configured",HttpStatus.SERVICE_UNAVAILABLE);
    const head=await fetch(presign(config,"HEAD",row.storage_key,60),{method:"HEAD",signal:AbortSignal.timeout(10000)});
    if(!head.ok)throw new ConflictException("uploaded object could not be verified in private storage");
    const actualSize=Number(head.headers.get("content-length"));
    const actualType=head.headers.get("content-type")?.split(";")[0]?.trim();
    if(actualSize!==Number(row.size_bytes)||actualType!==row.mime_type){
      await this.db.query("UPDATE file_objects SET status='rejected' WHERE id=$1 AND owner_id=$2",[id,req.userId]);
      throw new BadRequestException("uploaded object size or MIME type does not match its upload intent");
    }
    await this.db.query("UPDATE file_objects SET status='quarantine' WHERE id=$1 AND owner_id=$2 AND status='upload_intent'",[id,req.userId]);
    const scan=await this.scan(config,row);
    if(scan==="clean")await this.db.query("UPDATE file_objects SET status='scan_clean' WHERE id=$1 AND owner_id=$2 AND status='quarantine'",[id,req.userId]);
    if(scan==="infected")await this.db.query("UPDATE file_objects SET status='scan_infected' WHERE id=$1 AND owner_id=$2 AND status='quarantine'",[id,req.userId]);
    return {fileId:id,status:scan==="clean"?"scan_clean":scan==="infected"?"scan_infected":"quarantine",scanState:scan??"scan_unavailable",accessible:scan==="clean"};
  }

  @Get(":id")
  async get(@Param("id") id:string,@Req() req:{userId:string}) {
    const row=await this.ownedFile(id,req.userId);
    return {id:row.id,mimeType:row.mime_type,sizeBytes:Number(row.size_bytes),status:row.status,documentOf:row.document_of};
  }

  @Get(":id/download")
  async download(@Param("id") id:string,@Req() req:{userId:string}) {
    const row=await this.ownedFile(id,req.userId);
    if(row.status!=="scan_clean"||!row.storage_key)throw new ForbiddenException("file is not available until malware scanning returns clean");
    const config=storageConfig();
    if(!config)throw new HttpException("private object storage is not configured",HttpStatus.SERVICE_UNAVAILABLE);
    return {downloadUrl:presign(config,"GET",row.storage_key,120),expiresInSeconds:120};
  }

  @Post(":id/revoke")
  async revoke(@Param("id") id:string,@Req() req:{userId:string}) {
    const rows=await this.db.query<{id:string}>("UPDATE file_objects SET status='rejected' WHERE id=$1 AND owner_id=$2 AND status<>'rejected' RETURNING id",[id,req.userId]);
    if(!rows.length)throw new NotFoundException("file not found");
    return {revoked:true,fileId:id};
  }

  private async ownedFile(id:string,userId:string):Promise<FileRow>{
    const rows=await this.db.query<FileRow>("SELECT id,owner_id,mime_type,size_bytes,status,document_of,storage_key FROM file_objects WHERE id=$1 AND owner_id=$2",[id,userId]);
    if(!rows[0])throw new NotFoundException("file not found");
    return rows[0];
  }

  private async scan(config:StorageConfig,row:FileRow):Promise<"clean"|"infected"|null>{
    const endpoint=process.env.FILE_SCANNER_ENDPOINT;
    const apiKey=process.env.FILE_SCANNER_API_KEY;
    if(!endpoint||!apiKey)return null;
    try{
      if(new URL(endpoint).protocol!=="https:")return null;
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+apiKey},body:JSON.stringify({bucket:config.bucket,key:row.storage_key,mimeType:row.mime_type,sizeBytes:Number(row.size_bytes)}),signal:AbortSignal.timeout(10000)});
      if(!response.ok)return null;
      const result=await response.json() as {verdict?:string};
      return result.verdict==="clean"?"clean":result.verdict==="infected"?"infected":null;
    }catch{return null}
  }
}