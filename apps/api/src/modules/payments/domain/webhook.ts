import { createHmac, timingSafeEqual } from "node:crypto";

/** Webhook verification (S56). V5 fix #6: missing secret DISABLES the rail
 * (503 at the endpoint) instead of blocking boot - and never accepts
 * unsigned traffic. */
export type PaymentOutcome = "settled" | "failed" | "cancelled" | "disputed";

export interface ProviderEvent {
  eventId: string;
  orderId: string;
  outcome: PaymentOutcome;
  amountCents: number;
}

export class WebhookProcessor {
  readonly disabled: boolean;
  constructor(private readonly secret: string) { this.disabled = !secret; }
  get disabledReason(): string | null {
    return this.disabled ? "PAYMENT_PROVIDER_SECRET not configured - webhook rail safely disabled (S34)" : null;
  }
  sign(ev: ProviderEvent): string {
    return createHmac("sha256", this.secret).update(`${ev.eventId}:${ev.orderId}:${ev.outcome}:${ev.amountCents}`).digest("hex");
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