import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject, NotFoundException } from "@nestjs/common";
import { CreateOrderUseCase } from "../application/create-order.use-case";
import { TransitionOrderUseCase } from "../application/transition-order.use-case";
import { validateCreateOrderDto } from "../application/create-order.dto";
import { ORDER_REPOSITORY, OrderRepositoryPort } from "../domain/order.repository.port";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { Order } from "../domain/entities/order.entity";
import { AUDIT_LOG, AuditLogPort } from "../../audit/audit-log.service";

/** Explicit state commands only (S54). No generic PATCH route exists. */
@Controller("orders")
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly transition: TransitionOrderUseCase,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepositoryPort,
    private readonly db: DatabaseService,
    @Inject(AUDIT_LOG) private readonly audit: AuditLogPort,
  ) {}

  @Post()
  async create(@Req() req: { userId: string }, @Body() body: Record<string, unknown>) {
    const errors = validateCreateOrderDto(body as never);
    if (errors.length > 0) throw new HttpException(errors.join("; "), HttpStatus.BAD_REQUEST);
    return this.createOrder.execute({
      customerId: req.userId,
      serviceDefinitionId: body.serviceDefinitionId as string,
      serviceVersionId: body.serviceVersionId as string,
      priceCents: body.priceCents as number,
      currency: body.currency as string | undefined,
      idempotencyKey: body.idempotencyKey as string,
    });
  }

  @Get("business/mine")
  async listBusinessMine(@Req() req: { userId: string }) {
    const orders = await this.db.query<{ id: string; customer_id: string; service_definition_id: string; service_version_id: string; price_amount_cents: string | number; price_currency: string; status: string }>(
      `SELECT o.id,o.customer_id,o.service_definition_id,o.service_version_id,o.price_amount_cents,o.price_currency,o.status
       FROM orders o JOIN organization_members m ON m.organization_id=o.organization_id
       WHERE m.user_id=$1 ORDER BY o.created_at DESC LIMIT 100`, [req.userId]);
    return { orders: orders.map(o => ({ id: o.id, status: o.status, priceCents: Number(o.price_amount_cents), currency: o.price_currency })) };
  }

  @Post(":id/business-confirm")
  async businessConfirm(@Param("id") id: string, @Req() req: { userId: string }) {
    return this.businessTransition(id, req.userId, "confirm");
  }

  @Post(":id/business-cancel")
  async businessCancel(@Param("id") id: string, @Req() req: { userId: string }) {
    return this.businessTransition(id, req.userId, "cancel");
  }

  private async businessTransition(id: string, userId: string, command: "confirm" | "cancel") {
    const rows = await this.db.query<{ id: string; customer_id: string; service_definition_id: string; service_version_id: string; price_amount_cents: string | number; price_currency: string; status: string }>(
      `SELECT o.id,o.customer_id,o.service_definition_id,o.service_version_id,o.price_amount_cents,o.price_currency,o.status
       FROM orders o JOIN organization_members m ON m.organization_id=o.organization_id
       WHERE o.id=$1 AND m.user_id=$2 AND m.role IN ('owner','admin','manager')`, [id,userId]);
    const row = rows[0]; if (!row) throw new NotFoundException("order not found");
    const order = new Order(row.id,row.customer_id,Number(row.price_amount_cents),row.service_definition_id,row.service_version_id,row.price_currency,row.status);
    order[command]();
    await this.db.query("UPDATE orders SET status=$2,updated_at=now() WHERE id=$1", [id,order.status]);
    await this.audit.record({ actorUserId: userId, action: `business.order.${command}`, payload: { orderId: id, status: order.status } });
    return { id, status: order.status };
  }

  @Get()
  async listMine(@Req() req: { userId: string }) {
    const orders = await this.orders.findByCustomer(req.userId);
    return { orders: orders.map(o => ({ id: o.id, status: o.status, priceCents: o.priceCents, currency: o.currency })) };
  }

  @Post(":id/confirm")
  confirm(@Param("id") id: string, @Req() req: { userId: string }) {
    return this.transition.execute({ orderId: id, userId: req.userId, command: "confirm" });
  }
  @Post(":id/start")
  start(@Param("id") id: string, @Req() req: { userId: string }) {
    return this.transition.execute({ orderId: id, userId: req.userId, command: "start" });
  }
  @Post(":id/complete")
  complete(@Param("id") id: string, @Req() req: { userId: string }) {
    return this.transition.execute({ orderId: id, userId: req.userId, command: "complete" });
  }
  @Post(":id/cancel")
  cancel(@Param("id") id: string, @Req() req: { userId: string }) {
    return this.transition.execute({ orderId: id, userId: req.userId, command: "cancel" });
  }
}