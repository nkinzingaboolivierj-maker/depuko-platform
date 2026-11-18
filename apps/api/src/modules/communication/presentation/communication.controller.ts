import { randomUUID } from "node:crypto";
import { Body, Controller, Get, Param, Post, Req, UseGuards, BadRequestException, NotFoundException } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { PgConversationRepository } from "../infrastructure/pg-conversation.repository";
@Controller("conversations")
@UseGuards(AuthGuard)
export class CommunicationController {
  constructor(private readonly conversations: PgConversationRepository) {}
  @Get() async mine(@Req() req: { userId: string }) { return { conversations: await this.conversations.listForUser(req.userId) }; }
  @Post() async create(@Req() req: { userId: string }, @Body() body: { participantIds: string[]; scope: "customer_worker" | "project_team" | "support" }) {
    const ids = [...new Set([req.userId, ...(body?.participantIds ?? [])])];
    if (ids.length < 2 || !["customer_worker","project_team","support"].includes(body?.scope)) throw new BadRequestException("valid participants and conversation scope required");
    const id = `conv_${randomUUID()}`; await this.conversations.create(id, body.scope, ids); return { conversationId: id };
  }
  @Get(":id/messages") async messages(@Param("id") id: string, @Req() req: { userId: string }) {
    const messages = await this.conversations.messagesForUser(id, req.userId);
    if (!messages) throw new NotFoundException("conversation not found"); return { messages };
  }
  @Post(":id/messages") async post(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { text: string }) {
    if (!body?.text?.trim() || body.text.length > 10000) throw new BadRequestException("message must be 1-10000 characters");
    try { await this.conversations.post(id, req.userId, body.text.trim()); } catch { throw new NotFoundException("conversation not found"); }
    return { sent: true };
  }
}
