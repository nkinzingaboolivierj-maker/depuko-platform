import { Injectable } from '@nestjs/common';
import { Session } from '../domain/entities/session.entity';
import { SessionRepositoryPort } from '../domain/session.repository.port';

/**
 * Placeholder persistence. Replace with a real repository once the database
 * layer (see /database/README.md) is wired up — an in-memory store must
 * never ship to production (§100: no-fake-production).
 */
@Injectable()
export class InMemorySessionRepository implements SessionRepositoryPort {
  private readonly store = new Map<string, Session>();

  async save(session: Session): Promise<void> {
    this.store.set(session.id, session);
  }

  async findById(id: string): Promise<Session | null> {
    return this.store.get(id) ?? null;
  }
}
