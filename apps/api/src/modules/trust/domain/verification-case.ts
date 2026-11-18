/** Trust & Safety (S36). Verification outcomes and punitive decisions are
 * HUMAN decisions: AI scores may FLAG, never decide. Fraud cases, safety
 * incidents, reports, appeals and restrictions are first-class entities. */
export const CASE_TRANSITIONS: Record<string, readonly string[]> = {
  open: ["under_investigation", "dismissed"],
  under_investigation: ["resolved_restriction", "resolved_dismissed", "escalated"],
  escalated: ["under_investigation"],
  resolved_restriction: ["appealed"],
  resolved_dismissed: [],
  appealed: ["under_investigation"],
  dismissed: [],
};

export class VerificationCase {
  public readonly evidence: { submittedBy: string; description: string }[] = [];
  constructor(
    public readonly id: string,
    public readonly kind: "identity" | "business" | "worker_credential" | "fraud" | "safety_incident" | "report",
    public readonly subjectId: string,
    public status: string = "open",
    public decision?: { decidedBy: string; decision: "restrict" | "dismiss"; rationale: string },
  ) {}
  private to(next: string): void {
    if (!(CASE_TRANSITIONS[this.status] ?? []).includes(next)) {
      throw new Error(`illegal case transition ${this.status} -> ${next}`);
    }
    this.status = next;
  }
  submitEvidence(by: string, description: string): void {
    if (!description || description.trim().length === 0) throw new Error("evidence requires a description");
    this.evidence.push({ submittedBy: by, description: description.trim() });
  }
  investigate(): void { this.to("under_investigation"); }
  escalate(): void { this.to("escalated"); }
  /** Only a HUMAN reviewer may decide. An AI risk score is evidence, never
   * a decision - enforced by requiring reviewerId + rationale here. */
  resolveRestriction(reviewerId: string, rationale: string): void {
    if (!reviewerId || !rationale || rationale.length < 10) {
      throw new Error("restrictions require a human reviewer and a substantive rationale");
    }
    this.decision = { decidedBy: reviewerId, decision: "restrict", rationale };
    this.to("resolved_restriction");
  }
  resolveDismissed(reviewerId: string, rationale: string): void {
    if (!reviewerId || !rationale) throw new Error("dismissal requires a human reviewer and rationale");
    this.decision = { decidedBy: reviewerId, decision: "dismiss", rationale };
    this.to("resolved_dismissed");
  }
  appeal(): void { this.to("appealed"); }
}