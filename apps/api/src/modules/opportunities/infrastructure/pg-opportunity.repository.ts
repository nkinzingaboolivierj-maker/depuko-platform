import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { Opportunity, Application } from "../domain/opportunity";

/** Opportunity + application persistence (0012). Applications store an
 * IMMUTABLE snapshot (verified skills at submission time). */
@Injectable()
export class PgOpportunityRepository {
  constructor(private readonly db: DatabaseService) {}

  async saveOpportunity(opp: Opportunity): Promise<void> {
    await this.db.query(
      `INSERT INTO opportunities (id, organization_id, role, required_skills, region, mode, compensation_cents, duration_days, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
      [opp.id, opp.organizationId, opp.role, opp.requiredSkills, opp.region, opp.mode, opp.compensationCents, opp.durationDays, opp.status],
    );
  }

  async listPublished() {
    return this.db.query(`SELECT id,organization_id,role,required_skills,region,mode,compensation_cents,duration_days,status FROM opportunities WHERE status='published' ORDER BY created_at DESC LIMIT 100`);
  }

  async requireOpportunity(id: string): Promise<Opportunity> {
    const rows = await this.db.query<{ id: string; organization_id: string; role: string; required_skills: string[]; region: string; mode: string; compensation_cents: string | number; duration_days: number; status: string }>(
      `SELECT id, organization_id, role, required_skills, region, mode, compensation_cents, duration_days, status
       FROM opportunities WHERE id = $1`, [id]);
    if (rows.length === 0) throw new NotFoundException("opportunity not found");
    const r = rows[0]!;
    return new Opportunity(r.id, r.organization_id, r.role, r.required_skills, r.region, r.mode as never, Number(r.compensation_cents), r.duration_days, r.status);
  }


  async listApplicationsForWorker(applicantId: string) {
    return this.db.query(`SELECT a.id,a.opportunity_id,a.stage,a.created_at,o.role,o.region,o.compensation_cents,o.currency FROM opportunity_applications a JOIN opportunities o ON o.id=a.opportunity_id WHERE a.applicant_id=$1 ORDER BY a.created_at DESC LIMIT 100`, [applicantId]);
  }

  async saveApplication(app: Application): Promise<void> {
    await this.db.query(
      `INSERT INTO opportunity_applications (id, opportunity_id, applicant_id, snapshot, stage)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (opportunity_id, applicant_id) DO UPDATE SET stage = EXCLUDED.stage`,
      [app.id, app.opportunityId, app.applicantId,
       JSON.stringify(app.snapshot), app.stage],
    );
  }

  async requireApplication(opportunityId: string, applicantId: string): Promise<Application> {
    const rows = await this.db.query<{ snapshot: { verifiedSkills: string[]; headline: string }; stage: string }>(
      `SELECT snapshot, stage FROM opportunity_applications WHERE opportunity_id = $1 AND applicant_id = $2`,
      [opportunityId, applicantId]);
    if (rows.length === 0) throw new NotFoundException("application not found");
    const r = rows[0]!;
    const app = new Application("app_existing", opportunityId, applicantId, r.snapshot);
    app.stage = r.stage as never;
    return app;
  }
}