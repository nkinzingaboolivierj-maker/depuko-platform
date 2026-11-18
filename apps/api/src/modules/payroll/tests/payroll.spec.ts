import { PayrollRun, NO_RULES_ADAPTER } from "../domain/payroll";

describe("Payroll (S30)", () => {
  it("computes via the country adapter; unapproved overtime is an EXCEPTION, never paid", () => {
    const run = new PayrollRun("pr1", "org1", "2026-11-01", "2026-11-30");
    run.calculate([
      { baseCents: 300000, approvedOvertimeCents: 20000, unapprovedOvertimeMinutes: 45, configuredDeductionsCents: 0 },
    ], NO_RULES_ADAPTER);
    expect(run.status).toBe("calculated");
    expect(run.grossCents).toBe(320000);
    expect(run.netCents).toBe(320000);
    expect(run.exceptions).toHaveLength(1);
  });
  it("requires approval before paid; negative lines rejected", () => {
    const run = new PayrollRun("pr1", "org1", "2026-11-01", "2026-11-30");
    expect(() => run.markPaid()).toThrow(/illegal/);
    run.calculate([{ baseCents: 100, approvedOvertimeCents: 0, unapprovedOvertimeMinutes: 0, configuredDeductionsCents: 0 }], NO_RULES_ADAPTER);
    run.approve();
    run.markPaid();
    expect(run.status).toBe("paid");
    const bad = new PayrollRun("pr2", "org1", "2026-11-01", "2026-11-30");
    expect(() => bad.calculate([{ baseCents: -1, approvedOvertimeCents: 0, unapprovedOvertimeMinutes: 0, configuredDeductionsCents: 0 }], NO_RULES_ADAPTER)).toThrow(/negative/);
  });
  it("invalid period rejected", () => {
    expect(() => new PayrollRun("pr", "org1", "2026-11-30", "2026-11-01")).toThrow(/period/);
  });
});