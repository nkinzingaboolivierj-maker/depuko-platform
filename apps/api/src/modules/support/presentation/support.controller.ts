import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject, NotFoundException } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { TICKET_REPOSITORY, TicketRepositoryPort } from "../domain/ticket.repository.port";
import { Ticket } from "../domain/ticket";

/** PHASE 5: requester-scoped reads; internal notes never leave the staff
 * path. Lifecycle commands are explicit. */
@Controller("support")
@UseGuards(AuthGuard)
export class SupportController {
  constructor(@Inject(TICKET_REPOSITORY) private readonly tickets: TicketRepositoryPort) {}

  @Post("tickets")
  async create(@Req() req: { userId: string }, @Body() body: { category: string; priority?: "low" | "normal" | "high" | "urgent" }) {
    const t = new Ticket("tk_" + Math.random().toString(36).slice(2, 12), req.userId, body.category, body.priority ?? "normal");
    await this.tickets.saveTicket({ id: t.id, requester_id: t.requesterId, category: t.category, priority: t.priority, status: t.status, escalated: t.escalated });
    return { ticketId: t.id, status: t.status };
  }

  @Get("tickets/:id")
  async get(@Param("id") id: string, @Req() req: { userId: string }) {
    const row = await this.tickets.findTicketForRequester(id, req.userId);
    if (!row) throw new NotFoundException("ticket not found");
    const repo = this.tickets as import("../infrastructure/pg-ticket.repository").PgTicketRepository;
    return { ticket: row, messages: await repo.listMessagesForRequester(id) };
  }

  @Post("tickets/:id/messages")
  async reply(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { body: string }) {
    const row = await this.tickets.findTicketForRequester(id, req.userId);
    if (!row) throw new NotFoundException("ticket not found");
    if (!body.body || !body.body.trim()) throw new HttpException("empty reply", HttpStatus.BAD_REQUEST);
    await this.tickets.saveMessage({ id: "msg_" + Math.random().toString(36).slice(2, 12), ticket_id: id, author_id: req.userId, body: body.body.trim(), visible_to_customer: true, internal: false });
    return { sent: true };
  }

  @Post("tickets/:id/resolve")
  async resolve(@Param("id") id: string, @Req() req: { userId: string }) {
    const row = await this.tickets.findTicketForRequester(id, req.userId);
    if (!row) throw new NotFoundException("ticket not found");
    const t = new Ticket(row.id, row.requester_id, row.category, row.priority as "normal", row.status, row.escalated);
    try { t.resolve(); } catch (e) { throw new HttpException((e as Error).message, HttpStatus.CONFLICT); }
    await this.tickets.saveTicket({ ...row, status: t.status });
    return { ticketId: id, status: t.status };
  }
}