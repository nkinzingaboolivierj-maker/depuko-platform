import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req, UseGuards, ForbiddenException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";

@Controller("quotes")
@UseGuards(AuthGuard)
export class QuotesController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async mine(@Req() req: { userId: string }) {
    const rows = await this.db.query("SELECT id,order_id,status,total_cents,currency,created_at,expires_at FROM quotes WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 100", [req.userId]);
    return { quotes: rows.map((r: any) => ({ ...r, totalCents: Number(r.total_cents) })) };
  }

  @Get(":id")
  async detail(@Param("id") id: string, @Req() req: { userId: string }) {
    const rows = await this.db.query("SELECT id,order_id,status,total_cents,currency,lines,created_at,expires_at FROM quotes WHERE id=$1 AND customer_id=$2", [id,req.userId]);
    if (!rows[0]) throw new NotFoundException("quote not found");
    const r: any = rows[0]; return { ...r, totalCents: Number(r.total_cents), lines: r.lines ?? [] };
  }

  @Post(":id/accept")
  async accept(@Param("id") id: string, @Req() req: { userId: string }) {
    await this.db.withTransaction(async q => {
      const rows = await q<{ id: string; order_id: string; total_cents: string | number; currency: string; status: string }>(
        "SELECT id,order_id,total_cents,currency,status FROM quotes WHERE id=$1 AND customer_id=$2 FOR UPDATE", [id, req.userId]);
      const quote = rows[0];
      if (!quote) throw new NotFoundException("quote not found");
      if (quote.status !== "sent") throw new BadRequestException("only sent quotes can be accepted");
      const changed = await q<{ id: string }>(
        "UPDATE quotes SET status='accepted',updated_at=now() WHERE id=$1 AND customer_id=$2 AND status='sent' RETURNING id", [id, req.userId]);
      if (!changed.length) throw new BadRequestException("quote is no longer available for acceptance");
      const updatedOrder = await q<{ id: string }>(
        "UPDATE orders SET price_amount_cents=$2, price_currency=$3, updated_at=now() WHERE id=$1 AND customer_id=$4 RETURNING id",
        [quote.order_id, quote.total_cents, quote.currency, req.userId]);
      if (!updatedOrder.length) throw new NotFoundException("customer order not found");
    });
    return { id, status: "accepted" };
  }

  /** Business-only quote creation; organization membership and order ownership
   * are checked in SQL. The quote is sent only after the business creates it. */
  @Post("for-orders/:orderId")
  async createForOrder(@Param("orderId") orderId: string, @Req() req: { userId: string }, @Body() body: { organizationId: string; totalCents: number; currency?: string; lines?: Array<{ label: string; amountCents: number }> }) {
    if (!body?.organizationId || !Number.isSafeInteger(body.totalCents) || body.totalCents <= 0) throw new BadRequestException("organizationId and positive totalCents required");
    const memberships = await this.db.query("SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2", [body.organizationId,req.userId]);
    if (!memberships.length || !["owner","admin","manager"].includes((memberships[0] as any).role)) throw new ForbiddenException("business manager membership required");
    const orders = await this.db.query<{ id: string; customer_id: string; organization_id: string | null; status: string }>("SELECT id,customer_id,organization_id,status FROM orders WHERE id=$1 AND organization_id=$2", [orderId,body.organizationId]);
    const order = orders[0]; if (!order) throw new NotFoundException("business order not found");
    const lines = body.lines ?? [];
    if (lines.some(x => !x.label?.trim() || !Number.isSafeInteger(x.amountCents) || x.amountCents < 0)) throw new BadRequestException("invalid quote line");
    const sum = lines.reduce((n,x) => n+x.amountCents,0);
    if (lines.length && sum !== body.totalCents) throw new BadRequestException("quote lines must add up to totalCents");
    const id = `quo_${randomUUID()}`;
    await this.db.query("INSERT INTO quotes (id,order_id,organization_id,customer_id,total_cents,currency,lines,status) VALUES ($1,$2,$3,$4,$5,$6,$7,'sent')", [id,orderId,body.organizationId,order.customer_id,body.totalCents,body.currency ?? "RWF",JSON.stringify(lines)]);
    return { id, status: "sent", totalCents: body.totalCents };
  }
}
