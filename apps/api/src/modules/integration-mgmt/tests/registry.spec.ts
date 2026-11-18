import { IntegrationRegistry } from "../domain/registry";

describe("Integration registry (S34)", () => {
  it("missing credentials disable ONLY that integration", () => {
    const r = new IntegrationRegistry();
    r.register({ kind: "payment", provider: "psp_x", environment: "staging", credentialConfigured: true, enabled: true, failureBehavior: "fail_closed" });
    r.register({ kind: "email", provider: "mail_y", environment: "staging", credentialConfigured: false, enabled: true, failureBehavior: "degrade_gracefully" });
    expect(r.usable("payment", "psp_x").ok).toBe(true);
    const email = r.usable("email", "mail_y");
    expect(email.ok).toBe(false);
    expect(email.reason).toMatch(/credentials missing/);
    expect(r.usable("payment", "psp_x").ok).toBe(true); // unaffected
  });
  it("health report + failure tracking", () => {
    const r = new IntegrationRegistry();
    r.register({ kind: "ai", provider: "llm_z", environment: "local", credentialConfigured: true, enabled: true, failureBehavior: "degrade_gracefully" });
    r.recordFailure("ai", "llm_z", "timeout after 10s");
    const h = r.healthReport();
    expect(h[0]!.healthy).toBe(false);
    expect(h[0]!.lastFailure).toMatch(/timeout/);
    r.recordSuccess("ai", "llm_z");
  });
});