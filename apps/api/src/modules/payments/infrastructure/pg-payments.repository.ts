import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { PaymentIntent, Refund } from "../domain/payment-state";
import { PaymentsRepositoryPort } from "../domain/payments.repository.port";

interface IntentRow {
  id: string; order_id: string; amount_cents: string | number;
  currency: string; provider: string; status: string;
}

function intentToDomain(r: IntentRow): PaymentIntent {
  return new PaymentIntent(r.id, r.order_id, Number(r.amount_cents), r.currency, r.provider, r.status);
}

/** Real payments persistence (migrations 0005 + 0009). */
@Injectable()
export class PgPaymentsRepository implements PaymentsRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async createIntent(params: { id: string; orderId: string; amountCents: number; currency: string; provider: string }): Promise<PaymentIntent> {
    const intent = new PaymentIntent(params.id, params.orderId, params.amountCents, params.currency, params.provider);
    await this.db.query(
      `INSERT INTO payment_intents (id, order_id, amount_cents, currency, provider, status) VALUES ($1,$2,$3,$4,$5,$6)`,
      [params.id, params.orderId, params.amountCents, params.currency, params.provider, "created"],
    );
    return intent;
  }

  async findIntentById(id: string): Promise<PaymentIntent | null> {
    const rows = await this.db.query<IntentRow>(
      `SELECT id, order_id, amount_cents, currency, provider, status FROM payment_intents WHERE id = $1`, [id]);
    return rows[0] ? intentToDomain(rows[0]) : null;
  }

  async requireIntent(id: string): Promise<PaymentIntent> {
    const found = await this.findIntentById(id);
    if (!found) throw new NotFoundException("payment intent not found");
    return found;
  }

  async saveIntent(intent: PaymentIntent): Promise<void> {
    await this.db.query(`UPDATE payment_intents SET status = $2, updated_at = now() WHERE id = $1`, [intent.id, intent.status]);
  }

  async recordPayment(params: { id: string; intentId: string; orderId: string; amountCents: number; currency: string; provider: string; providerReference: string | null }): Promise<void> {
    await this.db.query(
      `INSERT INTO payments (id, payment_intent_id, order_id, amount_cents, currency, provider, provider_reference, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'captured')`,
      [params.id, params.intentId, params.orderId, params.amountCents, params.currency, params.provider, params.providerReference],
    );
  }

  async requestRefund(params: { id: string; intentId: string; paymentId: string; amountCents: number; currency: string; reason?: string }): Promise<void> {
    await this.db.query(
      `INSERT INTO refunds (id, payment_intent_id, payment_id, amount_cents, currency, reason) VALUES ($1,$2,$3,$4,$5,$6)`,
      [params.id, params.intentId, params.paymentId, params.amountCents, params.currency, params.reason ?? null],
    );
  }

  async saveRefund(refund: Refund): Promise<void> {
    await this.db.query(`UPDATE refunds SET status = $2, updated_at = now() WHERE id = $1`, [refund.id, refund.status]);
  }

  async listRefunds(intentId: string): Promise<Refund[]> {
    const rows = await this.db.query<{ id: string; payment_intent_id: string; amount_cents: string | number; status: string }>(
      `SELECT id, payment_intent_id, amount_cents, status FROM refunds WHERE payment_intent_id = $1 ORDER BY created_at`, [intentId]);
    return rows.map(r => new Refund(r.id, r.payment_intent_id, Number(r.amount_cents), r.status));
  }
}