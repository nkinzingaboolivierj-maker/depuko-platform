export type AssignmentStatus = "offered" | "accepted" | "checked_in" | "checked_out" | "declined";
export class Assignment {
  constructor(
    public readonly id: string,
    public readonly orderId: string,
    public readonly workerUserId: string,
    public readonly scheduledStart: Date,
    public readonly agreedDurationMinutes: number,
    public status: AssignmentStatus = "offered",
    public approvedExtensionMinutes = 0,
  ) {
    if (!id || !orderId || !workerUserId || !Number.isInteger(agreedDurationMinutes) || agreedDurationMinutes <= 0) throw new Error("invalid assignment");
  }
  accept(): void { this.transition("offered", "accepted"); }
  decline(): void { this.transition("offered", "declined"); }
  checkIn(): void { this.transition("accepted", "checked_in"); }
  checkOut(): void { this.transition("checked_in", "checked_out"); }
  approveExtension(minutes: number): void {
    if (this.status !== "checked_in") throw new Error("extension can only be approved during an active assignment");
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 240) throw new Error("extension must be 1-240 whole minutes");
    this.approvedExtensionMinutes += minutes;
  }
  private transition(from: AssignmentStatus, to: AssignmentStatus): void {
    if (this.status !== from) throw new Error(`illegal assignment transition ${this.status} -> ${to}`);
    this.status = to;
  }
}
