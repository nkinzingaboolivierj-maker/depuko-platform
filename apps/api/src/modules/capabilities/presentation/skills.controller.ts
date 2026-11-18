import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../../security/infrastructure/guards/permission.guard";
import { RequirePermission } from "../../security/infrastructure/guards/require-permission.decorator";
import { PgSkillsRepository } from "../infrastructure/pg-skills.repository";
import { WorkerSkillClaim } from "../domain/skills";

/** PHASE 6: workers claim skills (self-declared); verification is a human
 * admin decision (skills:verify) - self-declared is NEVER verified. */
@Controller("skills")
@UseGuards(AuthGuard)
export class SkillsController {
  constructor(@Inject(PgSkillsRepository) private readonly skills: PgSkillsRepository) {}

  @Post("definitions")
  @UseGuards(PermissionGuard)
  @RequirePermission("skills:verify")
  async define(@Body() body: { id: string; name: string; occupation: string }) {
    await this.skills.defineSkill(body.id, body.name, body.occupation);
    return { defined: true, id: body.id };
  }

  @Post("claims")
  async claim(@Req() req: { userId: string }, @Body() body: { skillId: string }) {
    await this.skills.saveClaim(new WorkerSkillClaim(req.userId, body.skillId));
    return { claimed: true, verification: "self_declared" };
  }

  @Post("claims/evidence")
  async evidence(@Req() req: { userId: string }, @Body() body: { skillId: string; evidenceRef: string }) {
    const claim = await this.skills.requireClaim(req.userId, body.skillId);
    try { claim.attachEvidence(body.evidenceRef); } catch (e) { throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST); }
    await this.skills.saveClaim(claim);
    return { evidenceAttached: true, verification: claim.verification };
  }

  @Post("claims/verify")
  @UseGuards(PermissionGuard)
  @RequirePermission("skills:verify")
  async verify(@Body() body: { workerId: string; skillId: string; score: number }) {
    const claim = await this.skills.requireClaim(body.workerId, body.skillId);
    try { claim.markVerified(body.score); } catch (e) { throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST); }
    await this.skills.saveClaim(claim);
    return { verified: true, workerId: body.workerId, skillId: body.skillId };
  }

  @Get("workers/me/verified")
  verifiedMine(@Req() req: { userId: string }) {
    return this.skills.listVerifiedSkills(req.userId);
  }

  @Get("workers/:workerId/verified")
  @UseGuards(PermissionGuard)
  @RequirePermission("skills:verify")
  verified(@Param("workerId") workerId: string) {
    return this.skills.listVerifiedSkills(workerId);
  }
}