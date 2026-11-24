import { Body, Controller, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject, ForbiddenException, BadRequestException } from "@nestjs/common";
import { ASSET_REPOSITORY, AssetRepositoryPort } from "../domain/asset.repository.port";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { DatabaseService } from "../../../infrastructure/database/database.service";

@Controller("assets")
@UseGuards(AuthGuard)
export class AssetsController {
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepositoryPort,
    private readonly db: DatabaseService,
  ) {}

  @Post(":id/reserve")
  async reserve(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { organizationId: string; start: string; end: string }) {
    await this.requireManager(body?.organizationId,req.userId);
    const start=new Date(body.start);const end=new Date(body.end);
    if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw new BadRequestException("valid start and end times are required");
    try {
      const row = await this.assets.reserve({assetId:id,organizationId:body.organizationId,reservedBy:req.userId,start,end});
      return { reserved:true,reservationId:row.id };
    } catch (e) {
      throw new HttpException((e as Error).message,HttpStatus.CONFLICT);
    }
  }

  private async requireManager(organizationId:string|undefined,userId:string) {
    if(!organizationId?.trim())throw new BadRequestException("organizationId is required");
    const rows=await this.db.query<{role:string}>("SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2",[organizationId,userId]);
    if(!rows.length||!["owner","admin","manager"].includes(rows[0]!.role))throw new ForbiddenException("organization manager membership required");
  }
}