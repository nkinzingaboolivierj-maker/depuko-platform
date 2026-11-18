/** PHASE 4: complete file lifecycle. A file is quarantined until a
 * CONFIGURED scanner returns a clean result; if scanning is unavailable the
 * file is NEVER labeled safe. Access revocation + retention included. */
export type ScanState = "pending_scan" | "scanning" | "clean" | "infected" | "scan_unavailable";

export interface MalwareScannerPort {
  /** Returns null when the scanning integration is unavailable. */
  scan(fileRef: string): Promise<{ verdict: "clean" | "infected"; signature?: string } | null>;
}

export class SecureFile {
  public scanState: ScanState = "pending_scan";
  public revoked = false;
  public readonly accessLog: { userId: string; at: number; action: string }[] = [];
  constructor(
    public readonly id: string,
    public readonly ownerId: string,
    public mimeType: string,
    public sizeBytes: number,
    public documentOf?: string,
    public retentionUntil?: number,
  ) {}
  isAccessible(): boolean {
    return this.scanState === "clean" && !this.revoked;
  }
  revoke(): void { this.revoked = true; }
  logAccess(userId: string, action: string): void {
    this.accessLog.push({ userId, at: Date.now(), action });
  }
}

export class FileLifecycleService {
  constructor(private readonly scanner: MalwareScannerPort | null) {}

  async process(file: SecureFile): Promise<ScanState> {
    if (!this.scanner) {
      // PHASE 4 directive: scanning unavailable => file is NEVER safe.
      file.scanState = "scan_unavailable";
      return file.scanState;
    }
    file.scanState = "scanning";
    const result = await this.scanner.scan(file.id);
    file.scanState = result === null ? "scan_unavailable" : result.verdict === "clean" ? "clean" : "infected";
    return file.scanState;
  }
}