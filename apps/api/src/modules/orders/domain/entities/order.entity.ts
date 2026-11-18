/** Order state machine (S11/S54). Explicit commands only; no generic PATCH. */
export const ORDER_TRANSITIONS: Record<string, readonly string[]> = {
  pending_payment: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly priceCents: number,
    public readonly serviceDefinitionId: string,
    public readonly serviceVersionId: string,
    public readonly currency: string = "RWF",
    public status: string = "pending_payment",
  ) {
    if (!id || !customerId || !serviceDefinitionId || !serviceVersionId) {
      throw new Error("invalid order: missing identity fields");
    }
    if (!Number.isInteger(priceCents) || priceCents <= 0) {
      throw new Error("invalid order: price must be positive integer minor units");
    }
    if (!(this.status in ORDER_TRANSITIONS)) {
      throw new Error("unknown order status: " + this.status);
    }
  }
  private transitionTo(next: string): void {
    if (!(ORDER_TRANSITIONS[this.status] ?? []).includes(next)) {
      throw new Error(`illegal transition ${this.status} -> ${next}`);
    }
    this.status = next;
  }
  confirm(): void { this.transitionTo("confirmed"); }
  start(): void { this.transitionTo("in_progress"); }
  complete(): void { this.transitionTo("completed"); }
  cancel(): void { this.transitionTo("cancelled"); }
}