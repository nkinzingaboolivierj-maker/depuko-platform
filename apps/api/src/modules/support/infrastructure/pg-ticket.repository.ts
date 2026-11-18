import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { TicketRepositoryPort, TicketRow, MessageRow } from "../domain/ticket.repository.port";

/** PHASE 5: internal notes are stored with internal=TRUE and are NEVER
 * returned by customer-facing reads (the query filters them out in SQL). */
@Injectable()
export class PgTicketRepository implements TicketRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async saveTicket(row: TicketRow): Promise<void> {
    await this.db.query(
      `INSERT INTO support_tickets (id, requester_id, category, priority, status, escalated)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, escalated = EXCLUDED.escalated`,
      [row.id, row.requester_id, row.category, row.priority, row.status, row.escalated],
    );
  }

  async saveMessage(row: MessageRow): Promise<void> {
    await this.db.query(
      `INSERT INTO support_ticket_messages (id, ticket_id, author_id, body, visible_to_customer, internal)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [row.id, row.ticket_id, row.author_id, row.body, row.visible_to_customer, row.internal],
    );
  }

  async findTicketForRequester(id: string, userId: string): Promise<TicketRow | null> {
    const rows = await this.db.query<TicketRow>(
      `SELECT id, requester_id, category, priority, status, escalated
       FROM support_tickets WHERE id = $1 AND requester_id = $2`,
      [id, userId],
    );
    return rows[0] ?? null;
  }

  /** Customer view: internal rows are excluded IN SQL - not filtered later. */
  async listMessagesForRequester(ticketId: string): Promise<MessageRow[]> {
    return this.db.query<MessageRow>(
      `SELECT id, ticket_id, author_id, body, visible_to_customer, internal
       FROM support_ticket_messages WHERE ticket_id = $1 AND internal = FALSE
       ORDER BY sent_at`,
      [ticketId],
    );
  }

  /** Staff view (admin console): all messages including internal notes. */
  async listAllMessages(ticketId: string): Promise<MessageRow[]> {
    return this.db.query<MessageRow>(
      `SELECT id, ticket_id, author_id, body, visible_to_customer, internal
       FROM support_ticket_messages WHERE ticket_id = $1 ORDER BY sent_at`,
      [ticketId],
    );
  }
}