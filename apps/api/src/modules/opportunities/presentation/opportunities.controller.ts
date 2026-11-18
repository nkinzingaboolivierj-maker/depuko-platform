import { randomUUID } from "node:crypto";
import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { PgOpportunityRepository } from "../infrastructure/pg-opportunity.repository";
import { Opportunity, Application } from "../domain/opportunity";
import { PgSkillsRepository } from "../../capabilities/infrastructure/pg-skills.repository";
import { PgWorkerRepository } from "../../workforce/infrastructure/pg-worker.repository";

@Controller("opportunities")
@UseGuards(AuthGuard)
export class OpportunitiesController {
  constructor(
    private readonly opportunities: PgOpportunityRepository,
    private readonly skills: PgSkillsRepository,
    private readonly workers: PgWorkerRepository,
    private readonly db: DatabaseService,
  ) {}

  @Get()
  async list() { return { opportunities: await this.opportunities.listPublished() }; }

  @Get("applications/mine")
  async myApplications(@Req() req: { userId: string }) { return { applications: await this.opportunities.listApplicationsForWorker(req.userId) }; }

  @Post()
  async create(@Req() req: { userId: string }, @Body() body: { organizationId: string; role: string; requiredSkills: string[]; region: string; mode: "onsite" | "remote" | "hybrid"; compensationCents: number; durationDays: number }) {
    await this.requireOrganizationManager(body.organizationId, req.userId);
    try {
      const opp = new Opportunity(`opp_${randomUUID()}`, body.organizationId, body.role, body.requiredSkills, body.region, body.mode, body.compensationCents, body.durationDays);
      await this.opportunities.saveOpportunity(opp);
      return { opportunityId: opp.id, status: opp.status };
    } catch (e) { throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST); }
  }

  @Post(":id/publish")
  async publish(@Param("id") id: string, @Req() req: { userId: string }) {
    const opp = await this.opportunities.requireOpportunity(id);
    await this.requireOrganizationManager(opp.organizationId, req.userId);
    try { opp.publish(); } catch (e) { throw new HttpException((e as Error).message, HttpStatus.CONFLICT); }
    await this.opportunities.saveOpportunity(opp);
    return { opportunityId: id, status: opp.status };
  }

  @Post(":id/applications")
  async apply(@Param("id") id: string, @Req() req: { userId: string }) {
    const opp = await this.opportunities.requireOpportunity(id);
    if (opp.status !== "published") throw new HttpException("opportunity is not open", HttpStatus.CONFLICT);
    const worker = await this.workers.findById(req.userId);
    if (!worker || worker.verificationStatus !== "verified") throw new HttpException("worker profile must be verified before applying", HttpStatus.FORBIDDEN);
    const verifiedSkills = (await this.skills.listVerifiedSkills(req.userId)).map(x => x.skill_id);
    const snapshot = { verifiedSkills, headline: worker.headline };
    const app = new Application(`app_${randomUUID()}`, id, req.userId, snapshot);
    await this.opportunities.saveApplication(app);
    return { applicationStage: app.stage, verifiedSkillsSnapshot: verifiedSkills };
  }

  /** Only an authorized member of the hiring organization may advance an application. */
  @Post(":id/applications/advance")
  async advance(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { applicantId: string; to: "screening" | "shortlisted" | "interviewing" | "assessment" | "selected" }) {
    if (!body?.applicantId) throw new HttpException("applicantId required", HttpStatus.BAD_REQUEST);
    const opportunity = await this.opportunities.requireOpportunity(id);
    await this.requireOrganizationManager(opportunity.organizationId, req.userId);
    const app = await this.opportunities.requireApplication(id, body.applicantId);
    try { app.advance(body.to); } catch (e) { throw new HttpException((e as Error).message, HttpStatus.CONFLICT); }
    await this.opportunities.saveApplication(app);
    return { stage: app.stage };
  }

  private async requireOrganizationManager(orgId: string, userId: string) {
    if (!orgId) throw new HttpException("organizationId required", HttpStatus.BAD_REQUEST);
    const rows = await this.db.query<{ role: string }>("SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2", [orgId,userId]);
    if (!rows.length || !["owner","admin","manager"].includes(rows[0].role)) throw new HttpException("business manager membership required", HttpStatus.FORBIDDEN);
  }
}
