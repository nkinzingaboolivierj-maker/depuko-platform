import { randomUUID } from "node:crypto";
import { Body, Controller, Get, Param, Post, Req, UseGuards, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { PgConversationRepository } from "../infrastructure/pg-conversation.repository";

@Controller("conversations")
@UseGuards(AuthGuard)
export class CommunicationController {
  constructor(
    private readonly conversations: PgConversationRepository,
    private readonly db: DatabaseService,
  ) {}

  @Get()
  async mine(@Req() req: { userId: string }) {
    return { conversations: await this.conversations.listForUser(req.userId) };
  }

  @Post()
  async create(@Req() req: { userId: string }, @Body() body: {
    participantIds: string[];
    scope: "customer_worker" | "project_team" | "support";
    organizationId?: string;
  }) {
    if (!["customer_worker","project_team","support"].includes(body?.scope) || !Array.isArray(body.participantIds)) {
      throw new BadRequestException("valid participants and conversation scope required");
    }
    const ids = [...new Set([req.userId,...body.participantIds])];
    if (ids.length < 2 || ids.length > 10 || ids.some(id=>typeof id!=="string"||!id.trim())) {
      throw new BadRequestException("a conversation requires 2-10 valid participants");
    }

    if (body.scope === "customer_worker") {
      if (ids.length !== 2) throw new BadRequestException("customer-worker conversations require exactly two participants");
      const related = await this.db.query<{ id: string }>(
        "SELECT o.id FROM orders o JOIN assignments a ON a.order_id=o.id WHERE o.status<>'cancelled' AND ((o.customer_id=$1 AND a.worker_user_id=$2) OR (o.customer_id=$2 AND a.worker_user_id=$1)) LIMIT 1",
        [ids[0],ids[1]],
      );
      if (!related.length) throw new ForbiddenException("participants must share an assigned order");
    }

    if (body.scope === "project_team") {
      if (!body.organizationId) throw new BadRequestException("organizationId is required for team conversations");
      const members = await this.db.query<{ count: string | number }>(
        "SELECT COUNT(DISTINCT user_id) AS count FROM organization_members WHERE organization_id=$1 AND user_id=ANY($2::text[])",
        [body.organizationId,ids],
      );
      if (Number(members[0]?.count ?? 0) !== ids.length) throw new ForbiddenException("all participants must belong to the same organization");
    }

    if (body.scope === "support") {
      if (ids.length !== 2) throw new BadRequestException("support conversations require exactly two participants");
      const admins = await this.db.query<{ id: string }>(
        "SELECT id FROM users WHERE id=ANY($1::text[]) AND roles @> ARRAY['admin']::text[]",
        [ids],
      );
      if (admins.length !== 1) throw new ForbiddenException("support conversations require one administrator and one requester");
    }

    const id = "conv_" + randomUUID();
    await this.conversations.create(id,body.scope,ids);
    return {conversationId:id};
  }

  @Get(":id/messages")
  async messages(@Param("id") id: string, @Req() req: { userId: string }) {
    const messages = await this.conversations.messagesForUser(id,req.userId);
    if (!messages) throw new NotFoundException("conversation not found");
    return {messages};
  }

  @Post(":id/messages")
  async post(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { text: string }) {
    if (!body?.text?.trim() || body.text.length > 10000) throw new BadRequestException("message must be 1-10000 characters");
    try { await this.conversations.post(id,req.userId,body.text.trim()); }
    catch { throw new NotFoundException("conversation not found"); }
    return {sent:true};
  }
}