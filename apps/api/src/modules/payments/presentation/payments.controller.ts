import { Body, Controller, Get, Headers, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ProcessWebhookUseCase } from "../application/process-webhook.use-case";
import { WebhookProcessor } from "../domain/webhook";
import { PAYMENTS_REPOSITORY, PaymentsRepositoryPort } from "../domain/payments.repository.port";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { ORDER_REPOSITORY, OrderRepositoryPort } from "../../orders/domain/order.repository.port";
import { DatabaseService } from "../../../infrastructure/database/database.service";

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly processWebhook: ProcessWebhookUseCase,
    @Inject(WebhookProcessor) private readonly processor: WebhookProcessor,
    @Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepositoryPort,
    private readonly db: DatabaseService,
  ) {}

  @Post(":orderId/webhook")
  async webhook(
    @Param("orderId") orderId: string,
    @Headers("x-webhook-signature") sig: string,
    @Body() body: { eventId: string; intentId: string; outcome: "settled" | "failed" | "cancelled" | "disputed"; amountCents: number; providerReference?: string },
  ) {
    if (this.processor.disabled) throw new HttpException(this.processor.disabledReason ?? "integration disabled", HttpStatus.SERVICE_UNAVAILABLE);
    if (!body?.eventId || body.eventId.length > 200 || !body.intentId || body.intentId.length > 200 ||
      !["settled", "failed", "cancelled", "disputed"].includes(body.outcome) ||
      !Number.isSafeInteger(body.amountCents) || body.amountCents <= 0 ||
      (body.providerReference !== undefined && (typeof body.providerReference !== "string" || body.providerReference.length > 256))) {
      throw new HttpException("invalid webhook payload", HttpStatus.BAD_REQUEST);
    }
    const result = await this.processWebhook.execute({
      event: { eventId: body.eventId, orderId, intentId: body.intentId, outcome: body.outcome, amountCents: body.amountCents, providerReference: body.providerReference },
      signature: sig,
    });
    if (result.status === "disabled") throw new HttpException("integration disabled", HttpStatus.SERVICE_UNAVAILABLE);
    if (result.status === "settled") return { orderId, status: "settled", ledgerTxId: result.txId };
    if (result.status === "duplicate") return { orderId, status: "duplicate" };
    return { orderId, status: result.status };
  }

  /** A customer may request (not execute) a refund only for their own captured payment. */
  @Post("intents/:intentId/refunds")
  @UseGuards(AuthGuard)
  async requestRefund(
    @Param("intentId") intentId: string,
    @Req() req: { userId: string },
    @Body() body: { amountCents: number; reason?: string },
  ) {
    const intent = await this.payments.findIntentById(intentId);
    if (!intent) throw new HttpException("payment intent not found", HttpStatus.NOT_FOUND);
    const order = await this.orders.findByIdForUser(intent.orderId, req.userId);
    if (!order) throw new HttpException("payment intent not found", HttpStatus.NOT_FOUND);
    if (!Number.isSafeInteger(body?.amountCents) || body.amountCents <= 0) throw new HttpException("positive integer refund amount required", HttpStatus.BAD_REQUEST);
    const paymentRows = await this.db.query<{ id: string; amount_cents: string | number }>(
      "SELECT id,amount_cents FROM payments WHERE payment_intent_id=$1 AND status IN ('captured','settled') ORDER BY occurred_at DESC LIMIT 1", [intentId]);
    const payment = paymentRows[0];
    if (!payment) throw new HttpException("no captured payment is available for refund", HttpStatus.CONFLICT);
    const existing = await this.db.query<{ refunded: string | number }>(
      "SELECT COALESCE(SUM(amount_cents),0) AS refunded FROM refunds WHERE payment_intent_id=$1 AND status <> 'rejected'", [intentId]);
    const remaining = Number(payment.amount_cents) - Number(existing[0]?.refunded ?? 0);
    if (body.amountCents > remaining) throw new HttpException("refund exceeds remaining captured amount", HttpStatus.BAD_REQUEST);
    await this.payments.requestRefund({ id: "rf_" + randomUUID(), intentId, paymentId: payment.id, amountCents: body.amountCents, currency: intent.currency, reason: body.reason });
    return { requested: true, intentId, amountCents: body.amountCents, status: "requested" };
  }

  @Get("intents/:intentId/refunds")
  @UseGuards(AuthGuard)
  async listRefunds(@Param("intentId") intentId: string, @Req() req: { userId: string }) {
    const intent = await this.payments.findIntentById(intentId);
    if (!intent || !(await this.orders.findByIdForUser(intent.orderId, req.userId))) throw new HttpException("payment intent not found", HttpStatus.NOT_FOUND);
    return { refunds: await this.payments.listRefunds(intentId) };
  }
}