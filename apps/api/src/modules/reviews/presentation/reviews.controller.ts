import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { PermissionGuard } from "../../security/infrastructure/guards/permission.guard";
import { RequirePermission } from "../../security/infrastructure/guards/require-permission.decorator";
import { REVIEW_REPOSITORY, ReviewRepositoryPort } from "../domain/review.repository.port";
import { Review } from "../domain/review";

@Controller("reviews")
@UseGuards(AuthGuard)
export class ReviewsController {
  constructor(@Inject(REVIEW_REPOSITORY) private readonly reviews: ReviewRepositoryPort, private readonly db: DatabaseService) {}

  @Post()
  async create(@Req() req: { userId: string }, @Body() body: { workRef: string; subjectId: string; quality: number; punctuality: number; communication: number; comment?: string }) {
    const eligible = await this.db.query<{ id: string }>(
      `SELECT o.id FROM orders o JOIN assignments a ON a.order_id=o.id
       WHERE o.id=$1 AND o.customer_id=$2 AND o.status='completed' AND a.worker_user_id=$3 AND a.status='checked_out' LIMIT 1`,
      [body.workRef, req.userId, body.subjectId]);
    if (!eligible.length) throw new HttpException("only the customer who owns completed work may review the assigned worker", HttpStatus.FORBIDDEN);
    const r = new Review("rev_" + Math.random().toString(36).slice(2, 12), body.workRef, req.userId, body.subjectId,
      { quality: body.quality, punctuality: body.punctuality, communication: body.communication }, body.comment);
    try {
      await this.reviews.save({ id: r.id, work_ref: r.workRef, author_id: r.authorId, subject_id: r.subjectId,
        quality: r.dimensions.quality, punctuality: r.dimensions.punctuality, communication: r.dimensions.communication,
        comment: r.comment ?? null, moderation: r.moderation });
    } catch (e) {
      throw new HttpException((e as Error).message, HttpStatus.CONFLICT);
    }
    return { reviewId: r.id, average: r.average() };
  }

  @Get()
  async mine(@Req() req: { userId: string }) {
    const rows = await this.db.query("SELECT id,work_ref,subject_id,quality,punctuality,communication,comment,moderation,created_at FROM reviews WHERE author_id=$1 ORDER BY created_at DESC LIMIT 100", [req.userId]);
    return { reviews: rows };
  }

  @Get("subjects/:subjectId")
  async forSubject(@Param("subjectId") subjectId: string) {
    return { reviews: await this.reviews.listVisibleForSubject(subjectId) };
  }

  @Post(":id/hide")
  @UseGuards(PermissionGuard)
  @RequirePermission("workers:suspend")
  async hide(@Param("id") id: string, @Req() req: { userId: string }) {
    const updated = await this.reviews.setModeration(id, "hidden");
    if (!updated) throw new HttpException("review not found", HttpStatus.NOT_FOUND);
    return { moderated: true, reviewId: id, by: req.userId };
  }
}