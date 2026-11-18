import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";

/** PHASE 6: analytics reads come from AUTHORITATIVE tables via aggregation
 * SQL. MEASURED values only - there is no forecast path here. These queries
 * are marked read-only; production must route them to a replica. */
@Injectable()
export class PgAnalyticsRepository {
  constructor(private readonly db: DatabaseService) {}

  async ordersByStatus(): Promise<{ status: string; count: string }[]> {
    return this.db.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM orders GROUP BY status ORDER BY count DESC`,
    );
  }

  async revenueByMonth(): Promise<{ month: string; revenue_cents: string }[]> {
    return this.db.query<{ month: string; revenue_cents: string }>(
      `SELECT to_char(posted_at, 'YYYY-MM') AS month,
              COALESCE(SUM(CASE WHEN e.direction = 'credit' THEN e.amount_cents ELSE -e.amount_cents END), 0)::text AS revenue_cents
       FROM ledger_entries e
       JOIN ledger_accounts a ON a.id = e.account_id
       WHERE a.account_type = 'revenue'
       GROUP BY month ORDER BY month`,
    );
  }

  async disputeCount(): Promise<{ count: string }> {
    const rows = await this.db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM disputes`);
    return rows[0] ?? { count: "0" };
  }

  async assignmentCompletion(): Promise<{ status: string; count: string }[]> {
    return this.db.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM assignments GROUP BY status`,
    );
  }
}