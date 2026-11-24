/** Payment intent / refund state machines. A provider-confirmed capture may
 * arrive while the intent is still in its initial created state. */
export const PAYMENT_INTENT_TRANSITIONS: Record<string, readonly string[]> = {
  created: ["pending", "authorized", "settled", "cancelled"],
  pending: ["authorized", "settled", "failed", "cancelled"],
  authorized: ["settled", "failed", "cancelled"],
  settled: ["refunded", "partially_refunded", "disputed"],
  partially_refunded: ["refunded"],
  refunded: [], failed: [], cancelled: [], disputed: ["refunded"],
};

export class PaymentIntent {
  constructor(
    public readonly id: string,
    public readonly orderId: string,
    public readonly amountCents: number,
    public readonly currency: string,
    public readonly provider: string,
    public status: string = "created",
  ) {
    if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error("invalid amount");
    if (!(this.status in PAYMENT_INTENT_TRANSITIONS)) throw new Error("unknown status: " + this.status);
  }
  transitionTo(next: string): void {
    if (!(PAYMENT_INTENT_TRANSITIONS[this.status] ?? []).includes(next)) {
      throw new Error("illegal payment transition " + this.status + " -> " + next);
    }
    this.status = next;
  }
  settle(): void { this.transitionTo("settled"); }
  fail(): void { this.transitionTo("failed"); }
  cancel(): void { this.transitionTo("cancelled"); }
  dispute(): void { this.transitionTo("disputed"); }
}

export const REFUND_TRANSITIONS: Record<string, readonly string[]> = {
  requested: ["approved", "rejected"],
  approved: ["processed", "failed"],
  processed: [], failed: ["approved"], rejected: [],
};

export class Refund {
  constructor(
    public readonly id: string,
    public readonly paymentIntentId: string,
    public readonly amountCents: number,
    public status: string = "requested",
  ) {
    if (!(this.status in REFUND_TRANSITIONS)) throw new Error("unknown refund status");
  }
  approve(): void {
    if (!(REFUND_TRANSITIONS[this.status] ?? []).includes("approved")) throw new Error("illegal refund transition");
    this.status = "approved";
  }
  reject(): void {
    if (!(REFUND_TRANSITIONS[this.status] ?? []).includes("rejected")) throw new Error("illegal refund transition");
    this.status = "rejected";
  }
  processed(): void {
    if (!(REFUND_TRANSITIONS[this.status] ?? []).includes("processed")) throw new Error("illegal refund transition");
    this.status = "processed";
  }
}