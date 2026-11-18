export const TICKET_REPOSITORY = "TICKET_REPOSITORY";

export interface TicketRow {
  id: string; requester_id: string; category: string; priority: string;
  status: string; escalated: boolean;
}
export interface MessageRow {
  id: string; ticket_id: string; author_id: string; body: string;
  visible_to_customer: boolean; internal: boolean;
}

export interface TicketRepositoryPort {
  saveTicket(row: TicketRow): Promise<void>;
  saveMessage(row: MessageRow): Promise<void>;
  findTicketForRequester(id: string, userId: string): Promise<TicketRow | null>;
  listMessagesForRequester(ticketId: string): Promise<MessageRow[]>;
}