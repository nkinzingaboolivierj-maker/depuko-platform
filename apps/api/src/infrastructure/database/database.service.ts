import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, QueryResultRow } from 'pg';

/**
 * Thin wrapper around a pg Pool. No ORM: §48/§89 require explicit migrations,
 * constraints, and indexes, and financial-adjacent code (finance, payments,
 * payroll modules) benefits from SQL that's auditable line-by-line rather
 * than generated. See ADR-008 in docs/architecture/phase-0-decisions.md.
 *
 * This is the ONLY class in the codebase that should import 'pg' directly —
 * every module gets access through repository classes that depend on this
 * service, never on the Pool itself (§92: no direct DB access outside
 * authorized backend infrastructure).
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;

  async onModuleInit() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  async query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.pool.query<T>(text, params);
    return result.rows;
  }

  /** Run a callback inside a transaction — needed for any multi-statement write (§48). */
  async withTransaction<T>(fn: (query: DatabaseService['query']) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const boundQuery = (async (text: string, params: unknown[] = []) => {
        const result = await client.query(text, params);
        return result.rows;
      }) as DatabaseService['query'];
      const value = await fn(boundQuery);
      await client.query('COMMIT');
      return value;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
