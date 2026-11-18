/** Audit events (S72): immutable rows for high-impact actions. V5 fix #5:
 * append-only is enforced by the DATABASE (migration 0010 trigger + REVOKE),
 * not just application convention. */
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../../infrastructure/database/database.service";

export const AUDIT_LOG = "AUDIT_LOG";

export interface AuditEvent {
  actorUserId: string;
  action: string;
  organizationId?: string;
  payload?: Record<string, unknown>;
}

export interface AuditLogPort {
  record(event: AuditEvent): Promise<void>;
}

@Injectable()
export class PgAuditLog implements AuditLogPort {
  constructor(private readonly db: DatabaseService) {}
  async record(event: AuditEvent): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_events (id, actor_user_id, action, organization_id, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), event.actorUserId, event.action, event.organizationId ?? null, JSON.stringify(event.payload ?? {})],
    );
  }
}

/** In-memory double for tests. */
export class InMemoryAuditLog implements AuditLogPort {
  readonly events: AuditEvent[] = [];
  async record(event: AuditEvent): Promise<void> { this.events.push(event); }
}