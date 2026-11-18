import { Controller, Get, UseGuards, Req, Post, Param } from "@nestjs/common";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { DatabaseService } from "../../infrastructure/database/database.service";

/** In-app notifications read/mark-read (V7.4). Email/SMS/push stay
 * disabled until the owner configures providers - never faked here. */
@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async mine(@Req() req: { userId: string }) {
    const rows = await this.db.query<{ id: string; text: string }>(
      `SELECT id, text FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.userId],
    );
    return { notifications: rows };
  }

  @Post(":id/read")
  async markRead(@Param("id") id: string, @Req() req: { userId: string }) {
    await this.db.query(
      `UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2`,
      [id, req.userId],
    );
    return { read: true };
  }
}