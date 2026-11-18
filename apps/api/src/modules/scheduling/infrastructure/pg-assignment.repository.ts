import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { AssignmentRepositoryPort, AssignmentRow } from "../domain/assignment.repository.port";

/** Real persistence for assignments (migration 0011 table). Worker-scoped
 * reads: a worker only ever sees their own assignments (BOLA in SQL). */
@Injectable()
export class PgAssignmentRepository implements AssignmentRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async save(row: AssignmentRow): Promise<void> {
    await this.db.query(
      `INSERT INTO assignments (id, order_id, worker_user_id, status,
                                 agreed_duration_minutes, approved_extension_minutes)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE
         SET status = EXCLUDED.status,
             approved_extension_minutes = EXCLUDED.approved_extension_minutes`,
      [row.id, row.order_id, row.worker_user_id, row.status,
       row.agreed_duration_minutes, row.approved_extension_minutes],
    );
  }

  async findByIdForWorker(id: string, workerUserId: string): Promise<AssignmentRow | null> {
    const rows = await this.db.query<AssignmentRow>(
      `SELECT id, order_id, worker_user_id, status,
              agreed_duration_minutes, approved_extension_minutes
       FROM assignments WHERE id = $1 AND worker_user_id = $2`,
      [id, workerUserId],
    );
    return rows[0] ?? null;
  }

  async listForWorker(workerUserId: string): Promise<AssignmentRow[]> {
    return this.db.query<AssignmentRow>(
      `SELECT id, order_id, worker_user_id, status,
              agreed_duration_minutes, approved_extension_minutes
       FROM assignments WHERE worker_user_id = $1 ORDER BY scheduled_start DESC LIMIT 100`,
      [workerUserId],
    );
  }
}