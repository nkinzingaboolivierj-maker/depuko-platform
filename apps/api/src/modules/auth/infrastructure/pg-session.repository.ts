import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../infrastructure/database/database.service';
import { Session } from '../domain/entities/session.entity';
import { SessionRepositoryPort } from '../domain/session.repository.port';

interface SessionRow {
  id: string;
  user_id: string;
  issued_at: Date;
  expires_at: Date;
}

function toDomain(row: SessionRow): Session {
  return Session.restore({
    id: row.id,
    userId: row.user_id,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
  });
}

/**
 * Real persistence backed by the `sessions` table (see
 * database/migrations/0001_init.sql). Replaces InMemorySessionRepository as
 * the production implementation.
 */
@Injectable()
export class PgSessionRepository implements SessionRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async save(session: Session): Promise<void> {
    await this.db.query(
      `INSERT INTO sessions (id, user_id, issued_at, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      [session.id, session.userId, session.issuedAt, session.expiresAt],
    );
  }

  async findById(id: string): Promise<Session | null> {
    const rows = await this.db.query<SessionRow>('SELECT * FROM sessions WHERE id = $1', [id]);
    return rows[0] ? toDomain(rows[0]) : null;
  }
}
