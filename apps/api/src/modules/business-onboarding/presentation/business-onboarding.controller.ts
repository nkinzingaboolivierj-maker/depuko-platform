import { randomUUID } from "node:crypto";
import { Body, Controller, Get, Param, Post, Req, UseGuards, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { listBusinessTemplates, getBusinessTemplate } from "../domain/templates";
import { PgOnboardingRepository } from "../infrastructure/pg-onboarding.repository";

@Controller("businesses")
export class BusinessOnboardingController {
  constructor(private readonly db: DatabaseService, private readonly onboarding: PgOnboardingRepository) {}

  @Get("templates") templates() { return listBusinessTemplates(); }

  @Post("register")
  @UseGuards(AuthGuard)
  async register(@Req() req: { userId: string }, @Body() body: { templateId: string; legalName: string; country: string; industry: string }) {
    const template = getBusinessTemplate(body?.templateId);
    if (!template || !body.legalName?.trim() || !/^[A-Z]{2}$/.test(body.country ?? "") || !body.industry?.trim()) throw new BadRequestException("valid templateId, legalName, ISO country and industry required");
    const id = "org_" + randomUUID();
    let registrationFee: { id: string; amountCents: number; currency: string; status: string } | null = null;
    await this.db.withTransaction(async query => {
      await query("INSERT INTO organizations (id,business_type,legal_name,country,industry,capabilities) VALUES ($1,$2,$3,$4,$5,$6)", [id, template.id, body.legalName.trim(), body.country, body.industry.trim(), template.capabilities]);
      await query("INSERT INTO organization_members (id,organization_id,user_id,role) VALUES ($1,$2,$3,'owner')", ["mem_" + randomUUID(),id,req.userId]);
      await query("INSERT INTO business_onboarding_sessions (id,organization_id,template_id,status) VALUES ($1,$2,$3,'registered')", ["onb_" + randomUUID(),id,template.id]);
      const prices = await query<{ id: string; amount_cents: string | number; currency: string }>(
        "SELECT id,amount_cents,currency FROM billing_catalog_items WHERE kind='registration_fee' AND audience='business' AND active=TRUE ORDER BY updated_at DESC LIMIT 1",
        [],
      );
      if (prices[0]) {
        const price = prices[0];
        const feeId = "fee_" + randomUUID();
        await query(
          "INSERT INTO registration_fee_obligations (id,user_id,organization_id,audience,catalog_item_id,amount_cents,currency) VALUES ($1,$2,$3,'business',$4,$5,$6) ON CONFLICT (user_id,audience) DO NOTHING",
          [feeId,req.userId,id,price.id,Number(price.amount_cents),price.currency],
        );
        const fee = await query<{ id: string; amount_cents: string | number; currency: string; status: string }>(
          "SELECT id,amount_cents,currency,status FROM registration_fee_obligations WHERE user_id=$1 AND audience='business'",
          [req.userId],
        );
        if (fee[0]) registrationFee = { id: fee[0].id, amountCents: Number(fee[0].amount_cents), currency: fee[0].currency, status: fee[0].status };
      }
    });
    return { organizationId: id, status: "registered", registrationFee };
  }

  @Get(":orgId/onboarding")
  @UseGuards(AuthGuard)
  async get(@Param("orgId") orgId: string, @Req() req: { userId: string }) {
    const row = await this.onboarding.findForOrganization(orgId, req.userId);
    if (!row) throw new NotFoundException("onboarding session not found");
    const template = getBusinessTemplate(row.template_id);
    if (!template) throw new NotFoundException("business template is not registered");
    const required = template.sections.flatMap(s => s.fields).filter(f => f.required).map(f => f.id);
    const missingRequired = required.filter(id => row.answers?.[id] === undefined || row.answers?.[id] === "");
    return { ...row, progress: required.length ? Math.round((required.length - missingRequired.length) / required.length * 100) : 100, missingRequired };
  }

  @Post(":orgId/onboarding/answers")
  @UseGuards(AuthGuard)
  async answer(@Param("orgId") orgId: string, @Req() req: { userId: string }, @Body() body: { fieldId: string; value: unknown }) {
    const row = await this.onboarding.findForOrganization(orgId, req.userId);
    if (!row) throw new NotFoundException("onboarding session not found");
    if (!["registered", "onboarding_in_progress", "rejected"].includes(row.status)) throw new ForbiddenException("onboarding is not editable");
    const template = getBusinessTemplate(row.template_id);
    if (!body?.fieldId || !template?.sections.some(s => s.fields.some(f => f.id === body.fieldId))) throw new BadRequestException("unknown onboarding field");
    await this.onboarding.saveAnswer(orgId, body.fieldId, body.value);
    return { saved: true };
  }

  @Post(":orgId/onboarding/submit")
  @UseGuards(AuthGuard)
  async submit(@Param("orgId") orgId: string, @Req() req: { userId: string }) {
    const row = await this.onboarding.findForOrganization(orgId, req.userId);
    if (!row) throw new NotFoundException("onboarding session not found");
    const template = getBusinessTemplate(row.template_id);
    if (!template) throw new NotFoundException("business template not found");
    const missing = template.sections.flatMap(s => s.fields).filter(f => f.required && (row.answers?.[f.id] === undefined || row.answers?.[f.id] === "")).map(f => f.id);
    if (missing.length) throw new BadRequestException("missing required fields: " + missing.join(", "));
    const docs = await this.db.query<{ document_type: string }>("SELECT document_type FROM business_onboarding_documents WHERE onboarding_session_id=$1 AND status <> 'rejected'", [row.id]);
    const missingDocs = template.requiredDocuments.filter(d => !docs.some(x => x.document_type === d));
    if (missingDocs.length) throw new BadRequestException("missing required documents: " + missingDocs.join(", "));
    await this.db.withTransaction(async query => {
      await query("UPDATE business_onboarding_sessions SET status='under_verification',updated_at=now() WHERE organization_id=$1", [orgId]);
      await query("UPDATE organizations SET status='under_verification',updated_at=now() WHERE id=$1", [orgId]);
    });
    return { status: "under_verification" };
  }
}