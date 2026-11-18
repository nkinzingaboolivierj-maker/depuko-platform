import { SkillDefinition, WorkerSkillClaim } from "../domain/skills";

describe("Capabilities (S22)", () => {
  it("self-declared is NOT verified; verification requires evidence + assessment", () => {
    const c = new WorkerSkillClaim("w1", "sk_pet_grooming");
    expect(c.isVerified()).toBe(false);
    c.attachEvidence("cert_scan_1");
    expect(c.verification).toBe("under_assessment");
    c.markVerified(88);
    expect(c.isVerified()).toBe(true);
  });
  it("verification without evidence path is impossible", () => {
    const c = new WorkerSkillClaim("w1", "sk_cleaning");
    expect(() => c.markVerified(90)).toThrow(/prior assessment/);
  });
  it("skill definitions are versioned", () => {
    const s = new SkillDefinition("sk1", "Electrical wiring", "electrician");
    s.bumpVersion();
    expect(s.version).toBe(2);
  });
});