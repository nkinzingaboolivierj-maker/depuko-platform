import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { WorkerSkillClaim } from "../domain/skills";

/** PHASE 6/2: skill claims persisted with explicit verification status.
 * UNIQUE (worker_id, skill_id) from 0012 blocks duplicate claims at the DB. */
@Injectable()
export class PgSkillsRepository {
  constructor(private readonly db: DatabaseService) {}

  async defineSkill(id: string, name: string, occupation: string): Promise<void> {
    await this.db.query(
      `INSERT INTO skill_definitions (id, name, occupation) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, occupation = EXCLUDED.occupation`,
      [id, name, occupation],
    );
  }

  async saveClaim(claim: WorkerSkillClaim): Promise<void> {
    await this.db.query(
      `INSERT INTO worker_skill_claims (id, worker_id, skill_id, verification, evidence_refs, assessment_score)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (worker_id, skill_id) DO UPDATE
         SET verification = EXCLUDED.verification,
             evidence_refs = EXCLUDED.evidence_refs,
             assessment_score = EXCLUDED.assessment_score`,
      ["wsc_" + Math.random().toString(36).slice(2, 12), claim.workerId, claim.skillId,
       claim.verification, claim.evidenceRefs, claim.assessmentScore ?? null],
    );
  }

  async listVerifiedSkills(workerId: string): Promise<{ skill_id: string; verification: string }[]> {
    return this.db.query<{ skill_id: string; verification: string }>(
      `SELECT skill_id, verification FROM worker_skill_claims WHERE worker_id = $1 AND verification = 'verified'`,
      [workerId],
    );
  }

  async requireClaim(workerId: string, skillId: string): Promise<WorkerSkillClaim> {
    const rows = await this.db.query<{ verification: string; evidence_refs: string[]; assessment_score: number | null }>(
      `SELECT verification, evidence_refs, assessment_score FROM worker_skill_claims WHERE worker_id = $1 AND skill_id = $2`,
      [workerId, skillId],
    );
    if (rows.length === 0) throw new NotFoundException("skill claim not found");
    const r = rows[0]!;
    return new WorkerSkillClaim(workerId, skillId, r.verification as never, r.evidence_refs, r.assessment_score ?? undefined);
  }
}