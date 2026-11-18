import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { WorkerProfileRow, WorkerRepositoryPort } from "../domain/worker.repository.port";
@Injectable()
export class PgWorkerRepository implements WorkerRepositoryPort {
  constructor(private readonly db: DatabaseService) {}
  async findById(userId: string): Promise<WorkerProfileRow | null> {
    const rows = await this.db.query<{ user_id: string; headline: string; country: string; skills: string[]; verification_status: WorkerProfileRow["verificationStatus"] }>(
      "SELECT user_id, headline, country, skills, verification_status FROM worker_profiles WHERE user_id = $1", [userId]);
    const row = rows[0];
    return row ? { userId: row.user_id, headline: row.headline, country: row.country, skills: row.skills ?? [], verificationStatus: row.verification_status } : null;
  }
  async save(profile: WorkerProfileRow): Promise<void> {
    await this.db.query(
      `INSERT INTO worker_profiles (user_id, headline, country, skills, verification_status)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id) DO UPDATE SET headline=EXCLUDED.headline, country=EXCLUDED.country, skills=EXCLUDED.skills`,
      [profile.userId, profile.headline, profile.country, profile.skills, profile.verificationStatus]);
  }
  async findVerifiedBySkills(skills: string[]): Promise<WorkerProfileRow[]> {
    if (!skills.length) return [];
    const rows = await this.db.query<{ user_id: string; headline: string; country: string; skills: string[]; verification_status: WorkerProfileRow["verificationStatus"] }>(
      "SELECT user_id, headline, country, skills, verification_status FROM worker_profiles WHERE verification_status='verified' AND skills @> $1::text[]",
      [skills]);
    return rows.map(r => ({ userId: r.user_id, headline: r.headline, country: r.country, skills: r.skills ?? [], verificationStatus: r.verification_status }));
  }
  async setVerification(userId: string, status: WorkerProfileRow["verificationStatus"]): Promise<boolean> {
    const rows = await this.db.query<{ user_id: string }>("UPDATE worker_profiles SET verification_status=$2 WHERE user_id=$1 RETURNING user_id", [userId, status]);
    return rows.length === 1;
  }
}
