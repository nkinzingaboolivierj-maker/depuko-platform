import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { ReviewRepositoryPort, ReviewRow } from "../domain/review.repository.port";

/** Published-only reads for subject listings; party-scoped reads for the
 * author/subject pair (BOLA in SQL). Duplicate reviews blocked by the
 * UNIQUE (work_ref, author_id, subject_id) constraint from 0012. */
@Injectable()
export class PgReviewRepository implements ReviewRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async save(row: ReviewRow): Promise<void> {
    await this.db.query(
      `INSERT INTO reviews (id, work_ref, author_id, subject_id, quality, punctuality, communication, comment, moderation)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (work_ref, author_id, subject_id) DO UPDATE SET moderation = EXCLUDED.moderation`,
      [row.id, row.work_ref, row.author_id, row.subject_id, row.quality, row.punctuality, row.communication, row.comment, row.moderation],
    );
  }

  async findByWorkForParty(workRef: string, userId: string): Promise<ReviewRow | null> {
    const rows = await this.db.query<ReviewRow>(
      `SELECT id, work_ref, author_id, subject_id, quality, punctuality, communication, comment, moderation
       FROM reviews WHERE work_ref = $1 AND (author_id = $2 OR subject_id = $2)`,
      [workRef, userId],
    );
    return rows[0] ?? null;
  }

  async setModeration(id: string, moderation: "published" | "hidden"): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>("UPDATE reviews SET moderation=$2 WHERE id=$1 RETURNING id", [id, moderation]);
    return rows.length > 0;
  }

  async listVisibleForSubject(subjectId: string): Promise<ReviewRow[]> {
    return this.db.query<ReviewRow>(
      `SELECT id, work_ref, author_id, subject_id, quality, punctuality, communication, comment, moderation
       FROM reviews WHERE subject_id = $1 AND moderation = 'published' ORDER BY created_at DESC LIMIT 50`,
      [subjectId],
    );
  }
}