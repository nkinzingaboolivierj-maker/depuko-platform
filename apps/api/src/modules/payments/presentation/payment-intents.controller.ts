import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { PAYMENTS_REPOSITORY, PaymentsRepositoryPort } from "../domain/payments.repository.port";
import { ORDER_REPOSITORY, OrderRepositoryPort } from "../../orders/domain/order.repository.port";

/** Customer payment intents (V7.3 section A): initiate (idempotent by key),
 * status, refund requests (admin-authorized via the refunds controller).
 * With no PSP configured the intent stays honest (created) - success is ONLY
 * ever set by a provider-verified webhook (the payments controller rail). */
@Controller("payments")
@UseGuards(AuthGuard)
export class PaymentIntentsController {
  constructor(
    @Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepositoryPort,
  ) {}

  @Post("intents")
  async initiate(@Req() req: { userId: string }, @Body() body: { orderId: string; amountCents: number; idempotencyKey: string }) {
    if (!body?.orderId || !body.idempotencyKey || body.idempotencyKey.length > 120) {
      throw new HttpException("orderId and bounded idempotencyKey required", HttpStatus.BAD_REQUEST);
    }
    // Ownership gate: the order must belong to the requesting customer.
    const order = await this.orders.findByIdForUser(body.orderId, req.userId);
    if (!order) throw new HttpException("order not found", HttpStatus.NOT_FOUND);
    const intentId = `pi_${req.userId}_${body.idempotencyKey}`;
    const existing = await this.payments.findIntentById(intentId);
    if (existing) {
      if (existing.orderId !== body.orderId || existing.amountCents !== order.priceCents) {
        throw new HttpException("idempotency key was already used for a different payment", HttpStatus.CONFLICT);
      }
      return { intentId: existing.id, status: existing.status, amountCents: existing.amountCents };
    }
    const intent = await this.payments.createIntent({
      id: intentId,
      orderId: body.orderId,
      amountCents: order.priceCents,
      currency: order.currency,
      provider: "configured_provider",
    });
    return { intentId: intent.id, status: intent.status, amountCents: intent.amountCents };
  }

  @Get("intents/:id")
  async status(@Param("id") id: string, @Req() req: { userId: string }) {
    const intent = await this.payments.findIntentById(id);
    if (!intent || !(await this.orders.findByIdForUser(intent.orderId, req.userId))) throw new HttpException("intent not found", HttpStatus.NOT_FOUND);
    return { status: intent.status, amountCents: intent.amountCents, currency: intent.currency };
  }
}