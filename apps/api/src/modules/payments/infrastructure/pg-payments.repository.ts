import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ProviderEvent } from "../domain/webhook";
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

@Injectable()
export class PgPaymentsRepository implements PaymentsRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async createIntent(params: { id: string; orderId: string; amountCents: number; currency: string; provider: string }): Promise<PaymentIntent> {
    await this.db.query(
      "INSERT INTO payment_intents (id, order_id, amount_cents, currency, provider, status) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING",
      [params.id, params.orderId, params.amountCents, params.currency, params.provider, "created"],
    );
    const persisted = await this.findIntentById(params.id);
    if (!persisted) throw new Error("payment intent could not be persisted");
    if (persisted.orderId !== params.orderId || persisted.amountCents !== params.amountCents || persisted.currency !== params.currency || persisted.provider !== params.provider) {
      throw new Error("idempotency key was already used for a different payment intent");
    }
    return persisted;
  }

  async findIntentById(id: string): Promise<PaymentIntent | null> {
    const rows = await this.db.query<IntentRow>(
      "SELECT id, order_id, amount_cents, currency, provider, status FROM payment_intents WHERE id = $1", [id]);
    return rows[0] ? intentToDomain(rows[0]) : null;
  }

  async requireIntent(id: string): Promise<PaymentIntent> {
    const found = await this.findIntentById(id);
    if (!found) throw new NotFoundException("payment intent not found");
    return found;
  }

  async saveIntent(intent: PaymentIntent): Promise<void> {
    await this.db.query("UPDATE payment_intents SET status = $2, updated_at = now() WHERE id = $1", [intent.id, intent.status]);
  }

  async recordPayment(params: { id: string; intentId: string; orderId: string; amountCents: number; currency: string; provider: string; providerReference: string | null }): Promise<void> {
    await this.db.query(
      "INSERT INTO payments (id, payment_intent_id, order_id, amount_cents, currency, provider, provider_reference, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'captured')",
      [params.id, params.intentId, params.orderId, params.amountCents, params.currency, params.provider, params.providerReference],
    );
  }

  /**
   * Atomic provider settlement. Event deduplication, captured payment persistence,
   * intent transition and double-entry ledger share one PostgreSQL transaction.
   */
  async settleWebhook(event: ProviderEvent): Promise<{ status: string; txId: string | null }> {
    if (!event.intentId) throw new Error("provider event must include the payment intent ID");
    return this.db.withTransaction(async q => {
      const received = await q<{ event_id: string }>(
        "INSERT INTO processed_webhook_events (event_id, provider) VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING RETURNING event_id",
        [event.eventId, "configured_provider"],
      );
      if (received.length === 0) return { status: "duplicate", txId: null };

      const intents = await q<IntentRow>(
        "SELECT id, order_id, amount_cents, currency, provider, status FROM payment_intents WHERE id = $1 AND order_id = $2 FOR UPDATE",
        [event.intentId, event.orderId],
      );
      const row = intents[0];
      if (!row) throw new NotFoundException("payment intent not found for provider event");
      const intent = intentToDomain(row);

      if (event.outcome === "settled") {
        if (intent.amountCents !== event.amountCents) throw new Error("provider settlement amount does not match payment intent");
        if (["settled", "partially_refunded", "refunded", "disputed"].includes(intent.status)) {
          return { status: "duplicate", txId: null };
        }
        if (!["created", "pending", "authorized"].includes(intent.status)) {
          throw new Error("cannot settle payment intent in " + intent.status + " state");
        }

        const paymentId = "pay_" + randomUUID();
        const paymentRows = await q<{ id: string }>(
          "INSERT INTO payments (id, payment_intent_id, order_id, amount_cents, currency, provider, provider_reference, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'captured') ON CONFLICT (provider_reference) DO NOTHING RETURNING id",
          [paymentId, intent.id, intent.orderId, intent.amountCents, intent.currency, intent.provider, event.providerReference ?? null],
        );
        if (paymentRows.length === 0) {
          const existing = await q<{ payment_intent_id: string; amount_cents: string | number }>(
            "SELECT payment_intent_id, amount_cents FROM payments WHERE provider_reference = $1",
            [event.providerReference],
          );
          if (!event.providerReference || !existing[0] || existing[0].payment_intent_id !== intent.id || Number(existing[0].amount_cents) !== event.amountCents) {
            throw new Error("provider reference is already associated with a different payment");
          }
          return { status: "duplicate", txId: null };
        }

        await q("UPDATE payment_intents SET status = 'settled', provider_reference = COALESCE($2, provider_reference), updated_at = now() WHERE id = $1",
          [intent.id, event.providerReference ?? null]);

        const txId = "ledger_payment_" + event.eventId;
        const ledgerTx = await q<{ id: string }>(
          "INSERT INTO ledger_transactions (id, description, reference) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING RETURNING id",
          [txId, "customer payment settled", event.providerReference ?? event.eventId],
        );
        if (ledgerTx.length === 0) throw new Error("ledger transaction already exists for this webhook event");
        await q(
          "INSERT INTO ledger_entries (id, transaction_id, account_id, direction, amount_cents, currency) VALUES ($1,$2,'acc_cash','debit',$4,$5), ($3,$2,'acc_payable','credit',$4,$5)",
          [randomUUID(), txId, randomUUID(), intent.amountCents, intent.currency],
        );
        const balance = await q<{ net: string | number }>(
          "SELECT COALESCE(SUM(CASE WHEN direction='debit' THEN amount_cents ELSE -amount_cents END),0) AS net FROM ledger_entries WHERE transaction_id = $1",
          [txId],
        );
        if (Number(balance[0]?.net ?? 1) !== 0) throw new Error("payment ledger is unbalanced; transaction rolled back");
        return { status: "settled", txId };
      }

      if (event.outcome === "failed" || event.outcome === "cancelled") {
        if (["settled", "partially_refunded", "refunded", "disputed"].includes(intent.status)) {
          throw new Error("provider cannot mark an already settled payment " + event.outcome);
        }
        await q("UPDATE payment_intents SET status = $2, updated_at = now() WHERE id = $1", [intent.id, event.outcome]);
        return { status: event.outcome, txId: null };
      }

      if (intent.status !== "settled" && intent.status !== "partially_refunded") {
        throw new Error("only a settled payment can be disputed");
      }
      await q("UPDATE payment_intents SET status = 'disputed', updated_at = now() WHERE id = $1", [intent.id]);
      return { status: "disputed", txId: null };
    });
  }

  async requestRefund(params: { id: string; intentId: string; paymentId: string; amountCents: number; currency: string; reason?: string }): Promise<void> {
    await this.db.query(
      "INSERT INTO refunds (id, payment_intent_id, payment_id, amount_cents, currency, reason) VALUES ($1,$2,$3,$4,$5,$6)",
      [params.id, params.intentId, params.paymentId, params.amountCents, params.currency, params.reason ?? null],
    );
  }

  async saveRefund(refund: Refund): Promise<void> {
    await this.db.query("UPDATE refunds SET status = $2, updated_at = now() WHERE id = $1", [refund.id, refund.status]);
  }

  async listRefunds(intentId: string): Promise<Refund[]> {
    const rows = await this.db.query<{ id: string; payment_intent_id: string; amount_cents: string | number; status: string }>(
      "SELECT id, payment_intent_id, amount_cents, status FROM refunds WHERE payment_intent_id = $1 ORDER BY created_at", [intentId]);
    return rows.map(r => new Refund(r.id, r.payment_intent_id, Number(r.amount_cents), r.status));
  }
}