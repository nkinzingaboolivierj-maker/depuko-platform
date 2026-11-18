import { VerificationCase } from "../domain/verification-case";

describe("Trust & Safety (S36)", () => {
  it("restrictions REQUIRE a human reviewer + substantive rationale (AI can only flag)", () => {
    const c = new VerificationCase("c1", "fraud", "user9");
    c.investigate();
    expect(() => c.resolveRestriction("", "short")).toThrow(/human reviewer/);
    c.resolveRestriction("admin1", "Confirmed duplicate accounts with matching payout details.");
    expect(c.decision?.decidedBy).toBe("admin1");
    expect(c.status).toBe("resolved_restriction");
  });
  it("appeal returns the case to investigation", () => {
    const c = new VerificationCase("c1", "identity", "user9");
    c.investigate();
    c.resolveRestriction("admin1", "Document mismatch after manual review of uploaded scans.");
    c.appeal();
    expect(c.status).toBe("appealed");
  });
  it("evidence requires descriptions", () => {
    const c = new VerificationCase("c1", "safety_incident", "w1");
    expect(() => c.submitEvidence("u1", "")).toThrow(/description/);
    c.submitEvidence("u1", "Photo of damaged equipment at site");
    expect(c.evidence).toHaveLength(1);
  });
});