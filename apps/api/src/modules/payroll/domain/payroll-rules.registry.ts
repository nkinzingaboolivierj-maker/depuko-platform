/** PHASE 3 (owner directive): payroll rules are per-country and must be
 * REVIEWED before any live processing. A country without reviewed rules
 * makes payroll UNAVAILABLE: no payslip, no net number, no approval.
 * The old NO_RULES_ADAPTER (gross == net) is BANNED from live runs - it
 * exists nowhere in the production path anymore. */
export interface ReviewedPayrollRules {
  country: string;
  reviewedBy: string;           // human reviewer identity (audit)
  reviewedAt: string;
  /** Deduction COMPONENTS are configured per country. The engine never
   * invents rates; it applies exactly what the reviewed config provides. */
  compute(input: { baseCents: number; approvedOvertimeCents: number }): {
    grossCents: number;
    totalDeductionsCents: number;
    netCents: number;
    lines: { label: string; amountCents: number }[];
  };
}

export class PayrollRulesRegistry {
  private readonly reviewed = new Map<string, ReviewedPayrollRules>();

  register(rules: ReviewedPayrollRules): void {
    if (!rules.country || !rules.reviewedBy) throw new Error("rules require a country and a named human reviewer");
    this.reviewed.set(rules.country.toUpperCase(), rules);
  }

  hasReviewedRules(country: string): boolean {
    return this.reviewed.has(country.toUpperCase());
  }

  /** The ONLY way payroll may compute. Throws UNAVAILABLE for unreviewed
   * countries - never falls back, never silently zeroes deductions. */
  require(country: string): ReviewedPayrollRules {
    const r = this.reviewed.get(country.toUpperCase());
    if (!r) {
      throw new Error(
        "PAYROLL UNAVAILABLE FOR " + country.toUpperCase() +
        ": no reviewed country rules. Local legal + configuration review is " +
        "REQUIRED before any payslip, net calculation, or approval. " +
        "(DEPUKO never invents tax rates or labor rules.)"
      );
    }
    return r;
  }

  availableCountries(): string[] {
    return [...this.reviewed.keys()];
  }
}

/** Payroll engine now REQUIRES reviewed rules (fix over V6). */
export class SafePayrollRun {
  public grossCents = 0;
  public netCents = 0;
  public lines: { label: string; amountCents: number }[] = [];
  public exceptions: string[] = [];
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly country: string,
    public readonly periodStart: string,
    public readonly periodEnd: string,
    public status: "draft" | "calculated" | "approved" | "paid" = "draft",
  ) {
    if (periodEnd <= periodStart) throw new Error("invalid payroll period");
  }
  calculate(entries: { baseCents: number; approvedOvertimeCents: number; unapprovedOvertimeMinutes: number }[], registry: PayrollRulesRegistry): void {
    if (this.status !== "draft") throw new Error("only draft runs can be calculated");
    const rules = registry.require(this.country); // UNAVAILABLE => throws here
    for (const e of entries) {
      if (e.baseCents < 0 || e.approvedOvertimeCents < 0) throw new Error("negative pay lines rejected");
      if (e.unapprovedOvertimeMinutes > 0) this.exceptions.push(e.unapprovedOvertimeMinutes + " unapproved overtime minutes excluded");
      const r = rules.compute(e);
      this.grossCents += r.grossCents;
      this.netCents += r.netCents;
      this.lines.push(...r.lines);
    }
    this.status = "calculated";
  }
  approve(approverId: string): void {
    if (this.status !== "calculated") throw new Error("approval requires a calculated run");
    if (!approverId) throw new Error("approval requires a named human approver");
    this.status = "approved";
  }
  markPaid(): void {
    if (this.status !== "approved") throw new Error("payment requires approval");
    this.status = "paid";
  }
}