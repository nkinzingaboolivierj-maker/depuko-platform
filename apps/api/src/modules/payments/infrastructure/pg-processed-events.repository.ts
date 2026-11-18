import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";

/** Replay protection (S56): PK-level dedup via INSERT ... ON CONFLICT DO
 * NOTHING. Returns true on first insert, false when already processed. */
@Injectable()
export class PgProcessedEventsRepository {
  constructor(private readonly db: DatabaseService) {}
  async recordOnce(eventId: string, provider: string): Promise<boolean> {
    const rows = await this.db.query<{ inserted: boolean }>(
      `INSERT INTO processed_webhook_events (event_id, provider) VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING RETURNING true AS inserted`,
      [eventId, provider]);
    return rows.length > 0 && Boolean(rows[0]?.inserted);
  }
}