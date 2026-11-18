import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { DisputeRepositoryPort, DisputeRow } from "../domain/dispute.repository.port";

/** Party-scoped access: only the raising party, the responding party or an
 * admin (checked at the controller) can read a dispute. BOLA in SQL. */
@Injectable()
export class PgDisputeRepository implements DisputeRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async save(row: DisputeRow): Promise<void> {
    await this.db.query(
      `INSERT INTO disputes (id, order_ref, raised_by, against, category, status, payout_held, resolution)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status,
         payout_held = EXCLUDED.payout_held, resolution = EXCLUDED.resolution`,
      [row.id, row.order_ref, row.raised_by, row.against, row.category, row.status, row.payout_held, JSON.stringify(row.resolution ?? null)],
    );
  }

  async findByIdForParty(id: string, userId: string): Promise<DisputeRow | null> {
    const rows = await this.db.query<DisputeRow>(
      `SELECT id, order_ref, raised_by, against, category, status, payout_held, resolution
       FROM disputes WHERE id = $1 AND (raised_by = $2 OR against = $2)`,
      [id, userId],
    );
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<DisputeRow | null> {
    const rows = await this.db.query<DisputeRow>(
      `SELECT id, order_ref, raised_by, against, category, status, payout_held, resolution FROM disputes WHERE id=$1`, [id]);
    return rows[0] ?? null;
  }

  async findByOrder(orderRef: string): Promise<DisputeRow[]> {
    return this.db.query<DisputeRow>(
      `SELECT id, order_ref, raised_by, against, category, status, payout_held, resolution
       FROM disputes WHERE order_ref = $1 ORDER BY created_at DESC`,
      [orderRef],
    );
  }
}