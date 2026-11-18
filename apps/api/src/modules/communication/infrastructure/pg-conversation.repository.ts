import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
@Injectable()
export class PgConversationRepository {
  constructor(private readonly db: DatabaseService) {}
  async create(id: string, scope: string, participants: string[]): Promise<void> {
    await this.db.query("INSERT INTO conversations (id,scope,participants) VALUES ($1,$2,$3)", [id,scope,participants]);
  }
  async listForUser(userId: string) {
    return this.db.query("SELECT id,scope,participants,created_at FROM conversations WHERE $1=ANY(participants) ORDER BY created_at DESC LIMIT 100", [userId]);
  }
  async messagesForUser(conversationId: string, userId: string) {
    const access = await this.db.query("SELECT id FROM conversations WHERE id=$1 AND $2=ANY(participants)", [conversationId,userId]);
    if (!access.length) return null;
    return this.db.query("SELECT id,from_user,text,sent_at FROM messages WHERE conversation_id=$1 ORDER BY sent_at ASC LIMIT 500", [conversationId]);
  }
  async post(conversationId: string, userId: string, text: string): Promise<void> {
    const access = await this.db.query("SELECT id FROM conversations WHERE id=$1 AND $2=ANY(participants)", [conversationId,userId]);
    if (!access.length) throw new Error("conversation not found or user is not a participant");
    await this.db.query("INSERT INTO messages (id,conversation_id,from_user,text) VALUES ($1,$2,$3,$4)", [`msg_${randomUUID()}`,conversationId,userId,text]);
  }
}
