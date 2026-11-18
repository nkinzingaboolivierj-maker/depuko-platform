/** Opportunities & Applications (S25). Snapshot applications so later
 * profile changes cannot alter a submitted application. Eligibility is
 * explicit and checkable before submission. */
export const OPPORTUNITY_STATUS: Record<string, readonly string[]> = {
  draft: ["published", "cancelled"],
  published: ["closed", "cancelled"],
  closed: [],
  cancelled: [],
};

export class Opportunity {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly role: string,
    public readonly requiredSkills: string[],
    public readonly region: string,
    public readonly mode: "onsite" | "remote" | "hybrid",
    public readonly compensationCents: number,
    public readonly durationDays: number,
    public status: string = "draft",
  ) {
    if (requiredSkills.length === 0) throw new Error("opportunity requires skills");
    if (!Number.isInteger(compensationCents) || compensationCents <= 0) throw new Error("invalid compensation");
  }
  publish(): void {
    if (this.status !== "draft") throw new Error("only drafts publish");
    this.status = "published";
  }
  close(): void {
    if (this.status !== "published") throw new Error("only published opportunities close");
    this.status = "closed";
  }
}

export class Application {
  public stage: "submitted" | "screening" | "shortlisted" | "interviewing" | "assessment" | "selected" | "rejected" | "withdrawn" = "submitted";
  constructor(
    public readonly id: string,
    public readonly opportunityId: string,
    public readonly applicantId: string,
    /** IMMUTABLE snapshot of the applicant's verified skills at submission. */
    public readonly snapshot: { verifiedSkills: string[]; headline: string },
  ) {}
  advance(to: "screening" | "shortlisted" | "interviewing" | "assessment" | "selected"): void {
    const order = ["submitted", "screening", "shortlisted", "interviewing", "assessment", "selected"] as const;
    const from = order.indexOf(this.stage as never);
    const dest = order.indexOf(to);
    if (dest !== from + 1) throw new Error("applications advance one stage at a time");
    this.stage = to;
  }
  reject(): void {
    if (this.stage === "selected") throw new Error("selected applications cannot be silently rejected");
    this.stage = "rejected";
  }
  withdraw(): void {
    if (this.stage === "selected") throw new Error("withdraw after selection requires the contract flow");
    this.stage = "withdrawn";
  }
}