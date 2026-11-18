import { SecureFile, FileLifecycleService } from "../domain/file-lifecycle";

describe("Secure file lifecycle (Phase 4)", () => {
  it("NO scanner configured => file is NEVER labeled safe", async () => {
    const svc = new FileLifecycleService(null);
    const f = new SecureFile("f1", "u1", "image/png", 1024);
    const state = await svc.process(f);
    expect(state).toBe("scan_unavailable");
    expect(f.isAccessible()).toBe(false);
  });
  it("clean verdict unlocks access; infected stays blocked; revocation wins", async () => {
    const svc = new FileLifecycleService({ scan: async () => ({ verdict: "clean" }) });
    const f = new SecureFile("f1", "u1", "image/png", 1024);
    await svc.process(f);
    expect(f.isAccessible()).toBe(true);
    f.logAccess("u1", "download");
    f.revoke();
    expect(f.isAccessible()).toBe(false);
    const bad = new SecureFile("f2", "u1", "application/pdf", 2048);
    const svc2 = new FileLifecycleService({ scan: async () => ({ verdict: "infected", signature: "EICAR" }) });
    await svc2.process(bad);
    expect(bad.isAccessible()).toBe(false);
    expect(bad.scanState).toBe("infected");
  });
  it("access is audited", () => {
    const f = new SecureFile("f1", "u1", "image/png", 512);
    f.logAccess("u1", "download");
    expect(f.accessLog).toHaveLength(1);
  });
});