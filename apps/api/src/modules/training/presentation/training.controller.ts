import { randomUUID } from "node:crypto";
import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req, UseGuards } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../../security/infrastructure/guards/permission.guard";
import { RequirePermission } from "../../security/infrastructure/guards/require-permission.decorator";

@Controller("training")
@UseGuards(AuthGuard)
export class TrainingController {
  constructor(private readonly db: DatabaseService) {}

  @Get("courses")
  async courses(@Req() req: { userId: string }) {
    return { courses: await this.db.query(
      "SELECT c.id,c.title,c.summary,c.content_url,c.duration_minutes,e.id AS enrollment_id,e.status AS enrollment_status,e.progress_percent FROM training_courses c LEFT JOIN worker_training_enrollments e ON e.course_id=c.id AND e.user_id=$1 WHERE c.active=TRUE ORDER BY c.created_at DESC LIMIT 100",
      [req.userId]
    ) };
  }

  @Get("mine")
  async mine(@Req() req: { userId: string }) {
    return { enrollments: await this.db.query(
      "SELECT e.id,e.course_id,e.status,e.progress_percent,e.enrolled_at,e.completed_at,c.title,c.summary,c.content_url,c.duration_minutes FROM worker_training_enrollments e JOIN training_courses c ON c.id=e.course_id WHERE e.user_id=$1 ORDER BY e.enrolled_at DESC LIMIT 100",
      [req.userId]
    ) };
  }

  @Post("courses")
  @UseGuards(PermissionGuard)
  @RequirePermission("skills:verify")
  async createCourse(@Req() req: { userId: string }, @Body() body: { title: string; summary?: string; contentUrl?: string; durationMinutes: number }) {
    if (!body?.title?.trim() || body.title.trim().length < 3 || body.title.length > 160) throw new BadRequestException("course title must contain 3-160 characters");
    if (!Number.isSafeInteger(body.durationMinutes) || body.durationMinutes < 1 || body.durationMinutes > 100000) throw new BadRequestException("durationMinutes must be a positive integer");
    if (body.contentUrl && !/^https:\\/\\//i.test(body.contentUrl)) throw new BadRequestException("course content URL must use HTTPS");
    const id = "course_" + randomUUID();
    await this.db.query(
      "INSERT INTO training_courses (id,title,summary,content_url,duration_minutes,created_by) VALUES ($1,$2,$3,$4,$5,$6)",
      [id,body.title.trim(),body.summary?.trim() ?? "",body.contentUrl ?? null,body.durationMinutes,req.userId]
    );
    return { courseId: id, created: true };
  }

  @Post("courses/:id/enroll")
  async enroll(@Param("id") id: string, @Req() req: { userId: string }) {
    const course = await this.db.query<{ id: string }>("SELECT id FROM training_courses WHERE id=$1 AND active=TRUE", [id]);
    if (!course.length) throw new NotFoundException("training course not found");
    await this.db.query(
      "INSERT INTO worker_training_enrollments (id,course_id,user_id) VALUES ($1,$2,$3) ON CONFLICT (course_id,user_id) DO NOTHING",
      ["enroll_" + randomUUID(),id,req.userId]
    );
    const enrollment = await this.db.query("SELECT id,status,progress_percent FROM worker_training_enrollments WHERE course_id=$1 AND user_id=$2", [id,req.userId]);
    return { enrollment: enrollment[0] };
  }

  @Post("enrollments/:id/progress")
  async progress(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { progressPercent: number }) {
    if (!Number.isSafeInteger(body?.progressPercent) || body.progressPercent < 0 || body.progressPercent > 100) throw new BadRequestException("progressPercent must be an integer from 0 to 100");
    const rows = await this.db.query<{ id: string; progress_percent: number }>(
      "SELECT id,progress_percent FROM worker_training_enrollments WHERE id=$1 AND user_id=$2",
      [id,req.userId]
    );
    if (!rows[0]) throw new NotFoundException("training enrollment not found");
    if (body.progressPercent < rows[0].progress_percent) throw new BadRequestException("training progress cannot move backwards");
    const completed = body.progressPercent === 100;
    const updated = await this.db.query(
      "UPDATE worker_training_enrollments SET progress_percent=$3,status=$4,completed_at=CASE WHEN $4='completed' THEN COALESCE(completed_at,now()) ELSE NULL END,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id,status,progress_percent,completed_at",
      [id,req.userId,body.progressPercent,completed?"completed":body.progressPercent>0?"in_progress":"enrolled"]
    );
    return { enrollment: updated[0] };
  }

  @Post("courses/:id/deactivate")
  @UseGuards(PermissionGuard)
  @RequirePermission("skills:verify")
  async deactivate(@Param("id") id: string) {
    const rows = await this.db.query<{ id: string }>("UPDATE training_courses SET active=FALSE,updated_at=now() WHERE id=$1 RETURNING id", [id]);
    if (!rows.length) throw new NotFoundException("training course not found");
    return { deactivated: true, courseId: id };
  }
}