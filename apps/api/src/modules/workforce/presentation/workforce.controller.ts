import { Body, Controller, Get, Param, Post, Req, UseGuards, BadRequestException, NotFoundException } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { AUDIT_LOG, AuditLogPort } from "../../audit/audit-log.service";
import { PermissionGuard } from "../../security/infrastructure/guards/permission.guard";
import { RequirePermission } from "../../security/infrastructure/guards/require-permission.decorator";
import { WorkerRepositoryPort, WORKER_REPOSITORY } from "../domain/worker.repository.port";
import { Inject } from "@nestjs/common";
@Controller("workforce")
export class WorkforceController {
  constructor(
    @Inject(WORKER_REPOSITORY) private readonly workers: WorkerRepositoryPort,
    @Inject(AUDIT_LOG) private readonly audit: AuditLogPort,
  ) {}
  @Get("me/profile") @UseGuards(AuthGuard)
  async mine(@Req() req: { userId: string }) { return { profile: await this.workers.findById(req.userId) }; }
  @Post("me/profile") @UseGuards(AuthGuard)
  async save(@Req() req: { userId: string }, @Body() body: { headline: string; country: string }) {
    if (!body?.headline?.trim() || !body.country?.trim()) throw new BadRequestException("headline and country required");
    const existing = await this.workers.findById(req.userId);
    await this.workers.save({ userId: req.userId, headline: body.headline.trim(), country: body.country.toUpperCase(), skills: existing?.skills ?? [], verificationStatus: existing?.verificationStatus ?? "pending" });
    return { saved: true };
  }
  @Post("workers/:id/verify") @UseGuards(AuthGuard, PermissionGuard) @RequirePermission("skills:verify")
  async verify(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { approved: boolean; rationale: string }) {
    if (typeof body?.approved !== "boolean") throw new BadRequestException("approved boolean is required");
    if (!body.rationale?.trim() || body.rationale.trim().length < 10) throw new BadRequestException("a human rationale of at least 10 characters is required");
    const changed = await this.workers.setVerification(id, body.approved ? "verified" : "rejected");
    if (!changed) throw new NotFoundException("worker profile not found");
    await this.audit.record({ actorUserId: req.userId, action: body.approved ? "workforce.worker_verified" : "workforce.worker_rejected", payload: { workerUserId: id, rationale: body.rationale.trim() } });
    return { workerId: id, verificationStatus: body.approved ? "verified" : "rejected" };
  }
}
