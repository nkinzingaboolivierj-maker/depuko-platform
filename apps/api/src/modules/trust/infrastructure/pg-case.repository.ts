import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { TrustCaseRepositoryPort, CaseRow } from "../domain/case.repository.port";

@Injectable()
export class PgTrustCaseRepository implements TrustCaseRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async save(row: CaseRow): Promise<void> {
    await this.db.query(
      `INSERT INTO trust_cases (id, kind, subject_id, status, decided_by, rationale)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status,
         decided_by = EXCLUDED.decided_by, rationale = EXCLUDED.rationale`,
      [row.id, row.kind, row.subject_id, row.status, row.decided_by, row.rationale],
    );
  }

  async findById(id: string): Promise<CaseRow | null> {
    const rows = await this.db.query<CaseRow>(
      `SELECT id, kind, subject_id, status, decided_by, rationale FROM trust_cases WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }
}