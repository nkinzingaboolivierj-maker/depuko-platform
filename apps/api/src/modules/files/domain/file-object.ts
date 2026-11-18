/** Secure files (S31). Private by default: a download is authorized via a
 * short-lived intent bound to owner + document; NO unrestricted public URLs
 * ever. Upload intents enforce MIME + size; scanning is a required gate
 * before a file becomes accessible. */
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_BYTES = 25 * 1024 * 1024;

export type FileStatus = "upload_intent" | "quarantine" | "scan_clean" | "scan_infected" | "rejected";

export class FileObject {
  constructor(
    public readonly id: string,
    public readonly ownerId: string,
    public mimeType: string,
    public sizeBytes: number,
    public status: FileStatus = "upload_intent",
    public documentOf?: string,
  ) {
    if (!ALLOWED_MIME.includes(mimeType)) throw new Error("MIME TYPE NOT ALLOWED: " + mimeType);
    if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_BYTES) throw new Error("FILE SIZE OUT OF RANGE");
  }
  markScanned(clean: boolean): void {
    if (this.status !== "quarantine") throw new Error("scan result requires quarantine state");
    this.status = clean ? "scan_clean" : "scan_infected";
  }
  quarantine(): void {
    if (this.status !== "upload_intent") throw new Error("only fresh uploads enter quarantine");
    this.status = "quarantine";
  }
  isAccessible(): boolean { return this.status === "scan_clean"; }
}

export class DownloadIntents {
  private readonly issued = new Map<string, { fileId: string; userId: string; expiresAt: number }>();
  /** Short-lived, single-user, bound-to-file intent. Never a public URL. */
  issue(fileId: string, userId: string, ttlSeconds = 300): string {
    if (ttlSeconds <= 0 || ttlSeconds > 600) throw new Error("ttl must be 1-600 seconds");
    const token = "dl_" + Math.random().toString(36).slice(2, 14);
    this.issued.set(token, { fileId, userId, expiresAt: Date.now() + ttlSeconds * 1000 });
    return token;
  }
  redeem(token: string, fileId: string, userId: string, now = Date.now()): boolean {
    const t = this.issued.get(token);
    if (!t || t.fileId !== fileId || t.userId !== userId || t.expiresAt < now) return false;
    this.issued.delete(token); // single-use
    return true;
  }
}