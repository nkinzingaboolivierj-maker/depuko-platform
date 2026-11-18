import { PayrollRulesRegistry, SafePayrollRun } from "../domain/payroll-rules.registry";

describe("Payroll safety (Phase 3 fix)", () => {
  function registryWithRW() {
    const r = new PayrollRulesRegistry();
    r.register({
      country: "RW", reviewedBy: "DINORT payroll lead", reviewedAt: "2026-11-01",
      compute: e => {
        const gross = e.baseCents + e.approvedOvertimeCents;
        const pension = Math.round(gross * 0.03); // EXAMPLE reviewed config value, set by the owner
        return { grossCents: gross, totalDeductionsCents: pension, netCents: gross - pension,
                 lines: [{ label: "configured pension component", amountCents: pension }] };
      },
    });
    return r;
  }

  it("a country WITHOUT reviewed rules is UNAVAILABLE - no payslip, no net, no approval", () => {
    const reg = new PayrollRulesRegistry(); // empty
    const run = new SafePayrollRun("pr", "org1", "RW", "2026-11-01", "2026-11-30");
    expect(() => run.calculate([], reg)).toThrow(/PAYROLL UNAVAILABLE/);
    expect(() => run.approve("admin1")).toThrow(/calculated/); // never reached calculation
    expect(run.status).toBe("draft");
  });

  it("WITH reviewed rules: compute -> approve -> paid; deductions explicit", () => {
    const reg = registryWithRW();
    const run = new SafePayrollRun("pr", "org1", "RW", "2026-11-01", "2026-11-30");
    run.calculate([{ baseCents: 300000, approvedOvertimeCents: 20000, unapprovedOvertimeMinutes: 0 }], reg);
    expect(run.status).toBe("calculated");
    expect(run.grossCents).toBe(320000);
    expect(run.netCents).toBeLessThan(run.grossCents); // configured deduction applied
    run.approve("approver1");
    run.markPaid();
    expect(run.status).toBe("paid");
  });

  it("unapproved overtime never becomes money; approval needs a human", () => {
    const reg = registryWithRW();
    const run = new SafePayrollRun("pr", "org1", "RW", "2026-11-01", "2026-11-30");
    run.calculate([{ baseCents: 100000, approvedOvertimeCents: 0, unapprovedOvertimeMinutes: 60 }], reg);
    expect(run.exceptions.join(" ")).toMatch(/60 unapproved/);
    expect(() => run.approve("")).toThrow(/human/);
  });
});