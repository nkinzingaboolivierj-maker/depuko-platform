/** Disputes (S44). Linked to orders/projects/contracts/payments; payout hold
 * and refunds are authorized outcomes, decided by humans, fully audited. */
export const DISPUTE_TRANSITIONS: Record<string, readonly string[]> = {
  open: ["under_investigation", "resolved"],
  under_investigation: ["mediation", "resolved"],
  mediation: ["resolved", "under_investigation"],
  resolved: ["appealed"],
  appealed: ["under_investigation"],
};

export class Dispute {
  public payoutHeld = false;
  public resolution?: { kind: "rework" | "partial_refund" | "full_refund" | "dismissed"; decidedBy: string; amountCents?: number };
  constructor(
    public readonly id: string,
    public readonly orderRef: string,
    public readonly raisedBy: string,
    public readonly against: string,
    public readonly category: string,
    public status: string = "open",
  ) {
    if (raisedBy === against) throw new Error("dispute needs two distinct parties");
  }
  private to(next: string): void {
    if (!(DISPUTE_TRANSITIONS[this.status] ?? []).includes(next)) {
      throw new Error(`illegal dispute transition ${this.status} -> ${next}`);
    }
    this.status = next;
  }
  holdPayout(): void {
    if (this.status === "open" || this.status === "under_investigation") this.payoutHeld = true;
    else throw new Error("payout hold only during open/investigation");
  }
  investigate(): void { this.to("under_investigation"); }
  mediate(): void { this.to("mediation"); }
  resolve(kind: "rework" | "partial_refund" | "full_refund" | "dismissed", decidedBy: string, amountCents?: number): void {
    if (!decidedBy) throw new Error("resolution requires a human decision maker");
    if ((kind === "partial_refund" || kind === "full_refund") && !Number.isInteger(amountCents)) {
      throw new Error("refund resolutions require an integer amount");
    }
    this.resolution = { kind, decidedBy, amountCents };
    this.to("resolved");
  }
  appeal(): void {
    if (this.status !== "resolved") throw new Error("only resolved disputes can be appealed");
    this.to("appealed");
  }
}