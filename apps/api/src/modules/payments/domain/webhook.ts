import { createHmac, timingSafeEqual } from "node:crypto";

/** A missing provider secret disables the webhook rail rather than accepting unsigned events. */
export type PaymentOutcome = "settled" | "failed" | "cancelled" | "disputed";

export interface ProviderEvent {
  eventId: string;
  orderId: string;
  intentId?: string;
  outcome: PaymentOutcome;
  amountCents: number;
  providerReference?: string;
}

export class WebhookProcessor {
  readonly disabled: boolean;
  constructor(private readonly secret: string) { this.disabled = !secret; }
  get disabledReason(): string | null {
    return this.disabled ? "PAYMENT_PROVIDER_SECRET not configured - webhook rail safely disabled" : null;
  }
  sign(ev: ProviderEvent): string {
    const payload = [ev.eventId, ev.orderId, ev.intentId ?? "", ev.outcome, String(ev.amountCents), ev.providerReference ?? ""].join(":");
    return createHmac("sha256", this.secret).update(payload).digest("hex");
  }
  process(ev: ProviderEvent, signature: string): { status: PaymentOutcome | "duplicate" | "disabled" } {
    if (this.disabled) return { status: "disabled" };
    const expected = Buffer.from(this.sign(ev));
    const given = Buffer.from(signature || "");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new Error("INVALID SIGNATURE - event rejected before any state change");
    }
    return { status: ev.outcome };
  }
}