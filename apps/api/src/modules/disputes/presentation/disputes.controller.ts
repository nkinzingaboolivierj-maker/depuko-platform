import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject, NotFoundException } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../../security/infrastructure/guards/permission.guard";
import { RequirePermission } from "../../security/infrastructure/guards/require-permission.decorator";
import { DISPUTE_REPOSITORY, DisputeRepositoryPort } from "../domain/dispute.repository.port";
import { Dispute } from "../domain/dispute";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { AUDIT_LOG, AuditLogPort } from "../../audit/audit-log.service";

/** Customers/workers raise and view disputes; resolutions are admin-gated
 * (humans decide, per S44). */
@Controller("disputes")
@UseGuards(AuthGuard)
export class DisputesController {
  constructor(
    @Inject(DISPUTE_REPOSITORY) private readonly disputes: DisputeRepositoryPort,
    private readonly db: DatabaseService,
    @Inject(AUDIT_LOG) private readonly audit: AuditLogPort,
  ) {}

  @Post()
  async create(@Req() req: { userId: string }, @Body() body: { orderRef: string; against: string; category: string }) {
    const partyRows = await this.db.query<{ customer_id: string; worker_user_id: string | null }>(
      `SELECT o.customer_id, a.worker_user_id FROM orders o LEFT JOIN assignments a ON a.order_id=o.id WHERE o.id=$1 ORDER BY a.created_at DESC LIMIT 1`,
      [body.orderRef]);
    const parties = partyRows[0];
    if (!parties || !parties.worker_user_id) throw new NotFoundException("completed/assigned work not found");
    const isCustomer = parties.customer_id === req.userId && body.against === parties.worker_user_id;
    const isWorker = parties.worker_user_id === req.userId && body.against === parties.customer_id;
    if (!isCustomer && !isWorker) throw new HttpException("only the customer or assigned worker may dispute this work", HttpStatus.FORBIDDEN);
    const d = new Dispute("dsp_" + Math.random().toString(36).slice(2, 12), body.orderRef, req.userId, body.against, body.category);
    await this.disputes.save({ id: d.id, order_ref: d.orderRef, raised_by: d.raisedBy, against: d.against, category: d.category, status: d.status, payout_held: false, resolution: null });
    await this.audit.record({ actorUserId: req.userId, action: "disputes.created", payload: { disputeId: d.id, orderRef: d.orderRef, against: d.against } });
    return { disputeId: d.id, status: d.status };
  }

  @Get(":id")
  async get(@Param("id") id: string, @Req() req: { userId: string }) {
    const row = await this.disputes.findByIdForParty(id, req.userId);
    if (!row) throw new NotFoundException("dispute not found"); // same 404 for non-parties
    return row;
  }

  @Post(":id/payout-hold")
  async hold(@Param("id") id: string, @Req() req: { userId: string }) {
    const row = await this.disputes.findByIdForParty(id, req.userId);
    if (!row) throw new NotFoundException("dispute not found");
    const d = this.hydrate(row);
    try { d.holdPayout(); } catch (e) { throw new HttpException((e as Error).message, HttpStatus.CONFLICT); }
    await this.db.withTransaction(async q => {
      await q("UPDATE disputes SET payout_held=true,status=$2 WHERE id=$1", [id, d.status]);
      await q(`INSERT INTO payout_holds (id,dispute_id,payout_id)
               SELECT 'ph_' || md5($1 || ':' || p.id), $1, p.id
               FROM payouts p WHERE p.order_id=$2 AND p.status NOT IN ('paid','failed','rejected')
               ON CONFLICT (dispute_id,payout_id) DO NOTHING`, [id, row.order_ref]);
    });
    await this.audit.record({ actorUserId: req.userId, action: "disputes.payout_hold_requested", payload: { disputeId: id, orderRef: row.order_ref } });
    return { disputeId: id, payoutHeld: true };
  }

  @Post(":id/resolve")
  @UseGuards(PermissionGuard)
  @RequirePermission("payments:refund")
  async resolve(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { kind: "rework" | "partial_refund" | "full_refund" | "dismissed"; amountCents?: number; rationale: string }) {
    if (!body?.rationale?.trim() || body.rationale.trim().length < 10) throw new HttpException("human rationale of at least 10 characters is required", HttpStatus.BAD_REQUEST);
    const row = await this.disputes.findById(id);
    if (!row) throw new NotFoundException("dispute not found");
    const orderRows = await this.db.query<{ price_amount_cents: string | number }>("SELECT price_amount_cents FROM orders WHERE id=$1", [row.order_ref]);
    if (!orderRows.length) throw new NotFoundException("related order not found");
    const amount = body.kind === "full_refund" ? Number(orderRows[0].price_amount_cents) : body.amountCents;
    const dispute = this.hydrate(row);
    try { dispute.resolve(body.kind, req.userId, amount); }
    catch (e) { throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST); }
    const resolution = { kind: body.kind, decidedBy: req.userId, rationale: body.rationale.trim(), amountCents: amount ?? null, refundExecution: body.kind.includes("refund") ? "authorized_not_executed" : "not_applicable" };
    await this.disputes.save({ ...row, status: dispute.status, payout_held: body.kind === "dismissed" ? false : row.payout_held, resolution });
    if (body.kind === "dismissed") {
      await this.db.query("UPDATE payout_holds SET released_at=now(),release_reason='dispute dismissed by authorized admin' WHERE dispute_id=$1 AND released_at IS NULL", [id]);
    }
    await this.audit.record({ actorUserId: req.userId, action: "disputes.resolved", payload: { disputeId: id, ...resolution } });
    return { disputeId: id, status: dispute.status, resolution, note: body.kind.includes("refund") ? "Refund is authorized in the dispute record; provider execution remains a separate verified PSP operation." : undefined };
  }

  private hydrate(row: import("../domain/dispute.repository.port").DisputeRow): Dispute {
    return new Dispute(row.id, row.order_ref, row.raised_by, row.against, row.category, row.status);
  }
}