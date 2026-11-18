/** EMPLOYEE payroll (S30) - deliberately SEPARATE from freelancer payouts
 * and partner settlements. NO invented tax rates: deductions are
 * CONFIGURED per country adapter; the domain only computes what a
 * configured adapter provides. Approval workflow is mandatory before any
 * payroll run is final. */
export const PAYROLL_RUN_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["calculated"],
  calculated: ["approved", "draft"],
  approved: ["paid"],
  paid: [],
};

export interface CountryPayrollAdapter {
  compute(entries: { baseCents: number; approvedOvertimeCents: number; configuredDeductionsCents: number }): {
    grossCents: number; totalDeductionsCents: number; netCents: number;
  };
}

export class PayrollRun {
  public grossCents = 0;
  public netCents = 0;
  public exceptions: string[] = [];
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly periodStart: string,
    public readonly periodEnd: string,
    public status: string = "draft",
  ) {
    if (periodEnd <= periodStart) throw new Error("invalid payroll period");
  }
  private to(next: string): void {
    if (!(PAYROLL_RUN_TRANSITIONS[this.status] ?? []).includes(next)) {
      throw new Error(`illegal payroll transition ${this.status} -> ${next}`);
    }
    this.status = next;
  }
  /** Compute from employee entries via the COUNTRY adapter. Unapproved
   * overtime is an EXCEPTION and never silently paid. */
  calculate(entries: { baseCents: number; approvedOvertimeCents: number; unapprovedOvertimeMinutes: number; configuredDeductionsCents: number }[], adapter: CountryPayrollAdapter): void {
    if (this.status !== "draft") throw new Error("only draft runs can be calculated");
    let gross = 0;
    let net = 0;
    for (const e of entries) {
      if (e.baseCents < 0 || e.approvedOvertimeCents < 0) throw new Error("negative pay lines rejected");
      if (e.unapprovedOvertimeMinutes > 0) this.exceptions.push(e.unapprovedOvertimeMinutes + " unapproved overtime minutes excluded");
      const r = adapter.compute(e);
      gross += r.grossCents;
      net += r.netCents;
    }
    this.grossCents = gross;
    this.netCents = net;
    this.to("calculated");
  }
  approve(): void { this.to("approved"); }
  recalculate(): void { this.to("draft"); }
  markPaid(): void { this.to("paid"); }
}

/** Rwanda placeholder adapter = NO deductions invented: returns gross == net.
 * Real statutory rates are the owner's configuration (audit doc tracks it). */
export const NO_RULES_ADAPTER: CountryPayrollAdapter = {
  compute: e => ({ grossCents: e.baseCents + e.approvedOvertimeCents, totalDeductionsCents: e.configuredDeductionsCents, netCents: e.baseCents + e.approvedOvertimeCents - e.configuredDeductionsCents }),
};