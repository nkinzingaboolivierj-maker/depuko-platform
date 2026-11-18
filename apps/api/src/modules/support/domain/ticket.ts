/** Support tickets (S32). INTERNAL NOTES ARE NEVER CUSTOMER-VISIBLE: they
 * live in a separate array that the API never serializes to customers. */
export const TICKET_TRANSITIONS: Record<string, readonly string[]> = {
  open: ["in_progress", "escalated", "resolved"],
  in_progress: ["escalated", "resolved"],
  escalated: ["in_progress", "resolved"],
  resolved: ["closed", "reopened"],
  closed: ["reopened"],
  reopened: ["in_progress", "resolved"],
};

export class Ticket {
  public readonly messages: { authorId: string; body: string; visibleToCustomer: boolean; at: number }[] = [];
  public readonly internalNotes: { authorId: string; body: string }[] = [];
  constructor(
    public readonly id: string,
    public readonly requesterId: string,
    public readonly category: string,
    public priority: "low" | "normal" | "high" | "urgent" = "normal",
    public status: string = "open",
    public escalated = false,
  ) {
    if (!requesterId || !category) throw new Error("ticket requires requester and category");
  }
  private to(next: string): void {
    if (!(TICKET_TRANSITIONS[this.status] ?? []).includes(next)) {
      throw new Error(`illegal ticket transition ${this.status} -> ${next}`);
    }
    this.status = next;
  }
  start(): void { this.to("in_progress"); }
  escalate(): void { this.escalated = true; this.to("escalated"); }
  resolve(): void { this.to("resolved"); }
  close(): void { this.to("closed"); }
  reopen(): void { this.to("reopened"); }
  reply(authorId: string, body: string, visibleToCustomer: boolean): void {
    if (!body || body.trim().length === 0) throw new Error("empty reply");
    this.messages.push({ authorId, body: body.trim(), visibleToCustomer, at: Date.now() });
  }
  /** Internal notes are stored but NEVER returned in customer views. */
  addInternalNote(authorId: string, body: string): void {
    if (!body || body.trim().length === 0) throw new Error("empty note");
    this.internalNotes.push({ authorId, body: body.trim() });
  }
  /** Only the requester (or staff) sees a ticket; notes are excluded here. */
  customerView(): object {
    return {
      id: this.id, category: this.category, priority: this.priority, status: this.status,
      escalated: this.escalated,
      messages: this.messages.filter(m => m.visibleToCustomer),
    };
  }
}