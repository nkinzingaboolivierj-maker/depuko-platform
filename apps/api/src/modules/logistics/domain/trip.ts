/** Delivery trips (S42). Explicit lifecycle: plan -> dispatch -> in_transit
 * with per-stop states. Proof of delivery is REQUIRED before customer
 * confirmation; failed stops trigger reschedule, never silent loss. */
export const TRIP_TRANSITIONS: Record<string, readonly string[]> = {
  planned: ["dispatched", "cancelled"],
  dispatched: ["in_transit", "cancelled"],
  in_transit: ["completed", "failed"],
  completed: [],
  failed: ["planned"],
  cancelled: [],
};

export const STOP_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["arrived"],
  arrived: ["loaded", "failed"],
  loaded: ["delivered", "failed"],
  delivered: ["confirmed"],
  confirmed: [],
  failed: ["pending"], // reschedule returns the stop to pending
};

export class Trip {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly vehicleId: string,
    public readonly driverUserId: string,
    public status: string = "planned",
  ) {}
  private to(next: string): void {
    if (!(TRIP_TRANSITIONS[this.status] ?? []).includes(next)) {
      throw new Error(`illegal trip transition ${this.status} -> ${next}`);
    }
    this.status = next;
  }
  dispatch(): void { this.to("dispatched"); }
  start(): void { this.to("in_transit"); }
  complete(): void { this.to("completed"); }
  fail(): void { this.to("failed"); }
  replan(): void { this.to("planned"); }
}

export class Stop {
  public proofOfDelivery: string | null = null;
  public failReason: string | null = null;
  constructor(
    public readonly id: string,
    public readonly tripId: string,
    public readonly orderRef: string,
    public readonly address: string,
    public status: string = "pending",
  ) {}
  private to(next: string): void {
    if (!(STOP_TRANSITIONS[this.status] ?? []).includes(next)) {
      throw new Error(`illegal stop transition ${this.status} -> ${next}`);
    }
    this.status = next;
  }
  arrive(): void { this.to("arrived"); }
  load(): void { this.to("loaded"); }
  deliver(proof: string): void {
    if (!proof || proof.trim().length < 4) throw new Error("PROOF OF DELIVERY REQUIRED (photo/signature/code)");
    this.proofOfDelivery = proof.trim();
    this.to("delivered");
  }
  confirm(): void {
    if (this.status !== "delivered") throw new Error("customer confirmation requires delivered state");
    this.to("confirmed");
  }
  fail(reason: string): void {
    if (!reason) throw new Error("failed delivery requires a reason");
    this.failReason = reason;
    this.to("failed");
  }
  reschedule(): void {
    if (this.status !== "failed") throw new Error("only failed stops can be rescheduled");
    this.to("pending");
  }
}