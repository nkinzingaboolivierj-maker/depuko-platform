import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject, NotFoundException } from "@nestjs/common";
import { ASSIGNMENT_REPOSITORY, AssignmentRepositoryPort } from "../domain/assignment.repository.port";
import { Assignment } from "../domain/assignment";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";

/** Worker-facing assignment operations. Explicit commands only (accept,
 * decline, check-in, check-out) - mirroring the order state machine rule. */
@Controller("assignments")
@UseGuards(AuthGuard)
export class SchedulingController {
  constructor(@Inject(ASSIGNMENT_REPOSITORY) private readonly assignments: AssignmentRepositoryPort) {}

  @Get("mine")
  async mine(@Req() req: { userId: string }) {
    return { assignments: await this.assignments.listForWorker(req.userId) };
  }

  @Post(":id/accept")
  async accept(@Param("id") id: string, @Req() req: { userId: string }) {
    return this.run(id, req.userId, "accept");
  }
  @Post(":id/decline")
  async decline(@Param("id") id: string, @Req() req: { userId: string }) {
    return this.run(id, req.userId, "decline");
  }
  @Post(":id/check-in")
  async checkIn(@Param("id") id: string, @Req() req: { userId: string }) {
    return this.run(id, req.userId, "checkIn");
  }
  @Post(":id/check-out")
  async checkOut(@Param("id") id: string, @Req() req: { userId: string }) {
    return this.run(id, req.userId, "checkOut");
  }
  @Post(":id/overtime")
  async overtime(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { minutes: number }) {
    const row = await this.requireMine(id, req.userId);
    const a = this.rehydrate(row);
    try { a.approveExtension(body.minutes); } catch (e) { throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST); }
    await this.assignments.save({ ...row, approved_extension_minutes: a.approvedExtensionMinutes, status: a.status });
    return { id, approvedExtensionMinutes: a.approvedExtensionMinutes };
  }

  private async run(id: string, userId: string, command: "accept" | "decline" | "checkIn" | "checkOut") {
    const row = await this.requireMine(id, userId);
    const a = this.rehydrate(row);
    try { a[command](); } catch (e) { throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST); }
    await this.assignments.save({ ...row, status: a.status });
    return { id, status: a.status };
  }

  private async requireMine(id: string, userId: string) {
    const row = await this.assignments.findByIdForWorker(id, userId);
    if (!row) throw new NotFoundException("assignment not found");
    return row;
  }
  private rehydrate(row: Awaited<ReturnType<AssignmentRepositoryPort["findByIdForWorker"]>>): Assignment {
    return new Assignment(row!.id, row!.order_id, row!.worker_user_id, new Date(),
      row!.agreed_duration_minutes, row!.status, row!.approved_extension_minutes);
  }
}