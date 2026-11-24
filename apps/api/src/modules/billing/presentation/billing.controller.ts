import { randomUUID } from "node:crypto";
import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, Post, Req, UseGuards } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../../security/infrastructure/guards/permission.guard";
import { RequirePermission } from "../../security/infrastructure/guards/require-permission.decorator";

type Audience = "customer" | "worker" | "business";
type CatalogKind = "registration_fee" | "subscription";
const audiences: Audience[] = ["customer", "worker", "business"];

@Controller("billing")
export class BillingController {
  constructor(private readonly db: DatabaseService) {}

  @Get("catalog")
  async catalog() {
    return { items: await this.db.query(
      "SELECT id,kind,audience,plan_key,title,description,amount_cents,currency,billing_interval FROM billing_catalog_items WHERE active=TRUE ORDER BY audience,kind,amount_cents"
    ) };
  }

  @Get("admin/catalog")
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission("pricing:change")
  async adminCatalog() {
    return { items: await this.db.query(
      "SELECT id,kind,audience,plan_key,title,description,amount_cents,currency,billing_interval,active,updated_at FROM billing_catalog_items ORDER BY audience,kind,plan_key"
    ) };
  }

  @Post("catalog")
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission("pricing:change")
  async saveCatalogItem(@Req() req: { userId: string }, @Body() body: {
    kind: CatalogKind; audience: Audience; planKey: string; title: string; description?: string;
    amountCents: number; currency: string; billingInterval: "one_time" | "monthly" | "quarterly" | "yearly"; active?: boolean;
  }) {
    if (!["registration_fee","subscription"].includes(body?.kind) || !audiences.includes(body?.audience)) throw new BadRequestException("valid kind and audience are required");
    if (!/^[a-z0-9_-]{2,64}$/.test(body.planKey ?? "") || !body.title?.trim() || body.title.length > 120) throw new BadRequestException("planKey and title are invalid");
    if (!Number.isSafeInteger(body.amountCents) || body.amountCents <= 0) throw new BadRequestException("amountCents must be a positive integer");
    const currency = (body.currency ?? "").toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestException("ISO currency code is required");
    if (!["one_time","monthly","quarterly","yearly"].includes(body.billingInterval)) throw new BadRequestException("invalid billing interval");
    if (body.kind === "registration_fee" && body.billingInterval !== "one_time") throw new BadRequestException("registration fees must be one-time");
    if (body.kind === "subscription" && body.billingInterval === "one_time") throw new BadRequestException("subscriptions require a recurring interval");

    const id = "price_" + randomUUID();
    const rows = await this.db.query<{ id: string }>(
      "INSERT INTO billing_catalog_items (id,kind,audience,plan_key,title,description,amount_cents,currency,billing_interval,active,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (kind,audience,plan_key) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,amount_cents=EXCLUDED.amount_cents,currency=EXCLUDED.currency,billing_interval=EXCLUDED.billing_interval,active=EXCLUDED.active,created_by=EXCLUDED.created_by,updated_at=now() RETURNING id",
      [id,body.kind,body.audience,body.planKey,body.title.trim(),body.description?.trim() ?? "",body.amountCents,currency,body.billingInterval,body.active ?? true,req.userId]
    );
    return { saved: true, id: rows[0]?.id };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async mine(@Req() req: { userId: string }) {
    const [fees, subscriptions] = await Promise.all([
      this.db.query("SELECT id,audience,amount_cents,currency,status,created_at,paid_at,waiver_reason FROM registration_fee_obligations WHERE user_id=$1 ORDER BY created_at DESC", [req.userId]),
      this.db.query("SELECT s.id,s.audience,s.amount_cents,s.currency,s.billing_interval,s.status,s.period_start,s.period_end,c.plan_key,c.title FROM billing_subscriptions s JOIN billing_catalog_items c ON c.id=s.catalog_item_id WHERE s.user_id=$1 ORDER BY s.created_at DESC", [req.userId]),
    ]);
    return { registrationFees: fees, subscriptions };
  }

  @Post("registration-fees")
  @UseGuards(AuthGuard)
  async createRegistrationFee(@Req() req: { userId: string }, @Body() body: { audience: Audience; organizationId?: string }) {
    this.validateAudience(body?.audience);
    const organizationId = await this.requireAudienceAccess(req.userId, body.audience, body.organizationId);
    const catalog = await this.db.query<{ id: string; amount_cents: string | number; currency: string }>(
      "SELECT id,amount_cents,currency FROM billing_catalog_items WHERE kind='registration_fee' AND audience=$1 AND active=TRUE ORDER BY updated_at DESC LIMIT 1",
      [body.audience]
    );
    if (!catalog[0]) throw new ConflictException("registration fee has not been configured by DEPUKO administration");
    const price = catalog[0];
    await this.db.query(
      "INSERT INTO registration_fee_obligations (id,user_id,organization_id,audience,catalog_item_id,amount_cents,currency) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id,audience) DO NOTHING",
      ["fee_" + randomUUID(),req.userId,organizationId,body.audience,price.id,Number(price.amount_cents),price.currency]
    );
    const obligation = await this.db.query(
      "SELECT id,audience,amount_cents,currency,status,created_at FROM registration_fee_obligations WHERE user_id=$1 AND audience=$2",
      [req.userId,body.audience]
    );
    return { registrationFee: obligation[0], paymentRequired: obligation[0]?.status === "pending", paymentProvider: "not_configured" };
  }

  @Post("subscriptions")
  @UseGuards(AuthGuard)
  async subscribe(@Req() req: { userId: string }, @Body() body: { audience: Audience; planKey: string; organizationId?: string }) {
    this.validateAudience(body?.audience);
    if (!/^[a-z0-9_-]{2,64}$/.test(body?.planKey ?? "")) throw new BadRequestException("valid planKey is required");
    const organizationId = await this.requireAudienceAccess(req.userId, body.audience, body.organizationId);
    const catalog = await this.db.query<{ id: string; amount_cents: string | number; currency: string; billing_interval: string }>(
      "SELECT id,amount_cents,currency,billing_interval FROM billing_catalog_items WHERE kind='subscription' AND audience=$1 AND plan_key=$2 AND active=TRUE",
      [body.audience,body.planKey]
    );
    if (!catalog[0]) throw new NotFoundException("subscription plan not found");
    const price = catalog[0];
    const created = await this.db.withTransaction(async query => {
      const current = await query<{ id: string; catalog_item_id: string; status: string }>(
        "SELECT id,catalog_item_id,status FROM billing_subscriptions WHERE user_id=$1 AND audience=$2 AND status IN ('pending','active','past_due') FOR UPDATE",
        [req.userId,body.audience]
      );
      if (current[0]) {
        if (current[0].catalog_item_id === price.id) return current[0];
        throw new ConflictException("an active or pending subscription already exists; cancel it before changing plans");
      }
      const id = "sub_" + randomUUID();
      const rows = await query<{ id: string; status: string }>(
        "INSERT INTO billing_subscriptions (id,user_id,organization_id,audience,catalog_item_id,amount_cents,currency,billing_interval,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING id,status",
        [id,req.userId,organizationId,body.audience,price.id,Number(price.amount_cents),price.currency,price.billing_interval]
      );
      return rows[0]!;
    });
    return { subscription: created, paymentRequired: created.status === "pending", paymentProvider: "not_configured" };
  }

  @Post("subscriptions/:id/cancel")
  @UseGuards(AuthGuard)
  async cancelSubscription(@Param("id") id: string, @Req() req: { userId: string }) {
    const rows = await this.db.query<{ id: string }>(
      "UPDATE billing_subscriptions SET status='cancelled',updated_at=now() WHERE id=$1 AND user_id=$2 AND status IN ('pending','active','past_due') RETURNING id",
      [id,req.userId]
    );
    if (!rows.length) throw new NotFoundException("subscription not found or cannot be cancelled");
    return { cancelled: true, subscriptionId: id };
  }

  @Post("registration-fees/:id/waive")
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission("pricing:change")
  async waiveFee(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { rationale: string }) {
    if (!body?.rationale?.trim() || body.rationale.trim().length < 10) throw new BadRequestException("a reason of at least 10 characters is required");
    const rows = await this.db.query<{ id: string }>(
      "UPDATE registration_fee_obligations SET status='waived',waiver_reason=$2,updated_at=now() WHERE id=$1 AND status='pending' RETURNING id",
      [id,body.rationale.trim()]
    );
    if (!rows.length) throw new NotFoundException("pending registration fee not found");
    return { waived: true, feeId: id, administratorId: req.userId };
  }

  private validateAudience(audience: Audience) {
    if (!audiences.includes(audience)) throw new BadRequestException("audience must be customer, worker or business");
  }

  private async requireAudienceAccess(userId: string, audience: Audience, organizationId?: string): Promise<string | null> {
    if (audience === "business") {
      if (!organizationId) throw new BadRequestException("organizationId is required for business billing");
      const rows = await this.db.query<{ organization_id: string }>(
        "SELECT organization_id FROM organization_members WHERE organization_id=$1 AND user_id=$2 AND role IN ('owner','admin')",
        [organizationId,userId]
      );
      if (!rows.length) throw new NotFoundException("business organization not found");
      return organizationId;
    }
    const rows = await this.db.query<{ roles: string[] }>("SELECT roles FROM users WHERE id=$1", [userId]);
    const expected = audience === "worker" ? "worker" : "customer";
    if (!rows[0]?.roles?.includes(expected)) throw new ConflictException("this account is not registered as a " + audience);
    return null;
  }
}