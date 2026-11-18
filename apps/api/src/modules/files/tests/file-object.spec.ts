import { FileObject, DownloadIntents } from "../domain/file-object";

describe("Secure files (S31)", () => {
  it("rejects disallowed MIME and out-of-range sizes", () => {
    expect(() => new FileObject("f1", "u1", "application/zip", 100)).toThrow(/MIME/);
    expect(() => new FileObject("f1", "u1", "image/png", 0)).toThrow(/SIZE/);
    expect(() => new FileObject("f1", "u1", "image/png", 30 * 1024 * 1024)).toThrow(/SIZE/);
  });
  it("files are inaccessible until scanned clean", () => {
    const f = new FileObject("f1", "u1", "image/png", 2048);
    f.quarantine();
    expect(f.isAccessible()).toBe(false);
    f.markScanned(true);
    expect(f.isAccessible()).toBe(true);
  });
  it("infected files stay inaccessible", () => {
    const f = new FileObject("f1", "u1", "application/pdf", 4096);
    f.quarantine();
    f.markScanned(false);
    expect(f.isAccessible()).toBe(false);
    expect(f.status).toBe("scan_infected");
  });
  it("download intents are short-lived, single-use, owner-bound (no public URLs)", () => {
    const intents = new DownloadIntents();
    const token = intents.issue("f1", "u1", 300);
    expect(intents.redeem(token, "f1", "u2")).toBe(false);       // wrong user
    expect(intents.redeem(token, "f2", "u1")).toBe(false);       // wrong file
    expect(intents.redeem(token, "f1", "u1")).toBe(true);        // ok
    expect(intents.redeem(token, "f1", "u1")).toBe(false);       // single-use
    const t2 = intents.issue("f1", "u1", 1);
    expect(intents.redeem(t2, "f1", "u1", Date.now() + 5000)).toBe(false); // expired
  });
});