import { Body, Controller, Get, Inject, Post, Req, UseGuards, ForbiddenException, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { WORKER_REPOSITORY, WorkerRepositoryPort } from "../../workforce/domain/worker.repository.port";
import { rankWorkersForSkills } from "../domain/dispatch-policy";
import { DatabaseService } from "../../../infrastructure/database/database.service";

/** Ranks verified workers for authorized organization managers. Availability
 * is derived from active accepted/check-in assignments, never assumed true. */
@Controller("dispatch")
@UseGuards(AuthGuard)
export class DispatchController {
  constructor(
    @Inject(WORKER_REPOSITORY) private readonly workers: WorkerRepositoryPort,
    private readonly db: DatabaseService,
  ) {}

  @Post("rank")
  async rank(@Body() body: { organizationId: string; requiredSkills: string[] }, @Req() req: { userId: string }) {
    if(!body?.organizationId||!Array.isArray(body.requiredSkills)||!body.requiredSkills.length||body.requiredSkills.some(s=>typeof s!=="string"||!s.trim()))throw new BadRequestException("organizationId and requiredSkills are required");
    const membership=await this.db.query<{role:string}>("SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2",[body.organizationId,req.userId]);
    if(!membership.length||!["owner","admin","manager"].includes(membership[0]!.role))throw new ForbiddenException("organization manager membership required");
    const verified = await this.workers.findVerifiedBySkills(body.requiredSkills);
    const busyRows=await this.db.query<{worker_user_id:string}>(
      "SELECT DISTINCT worker_user_id FROM assignments WHERE status IN ('accepted','checked_in') AND scheduled_start + ((agreed_duration_minutes + approved_extension_minutes) * interval '1 minute') > now()",
      [],
    );
    const busy=new Set(busyRows.map(row=>row.worker_user_id));
    const ranked = rankWorkersForSkills(
      verified.map(w => ({userId:w.userId,skills:w.skills,verificationStatus:w.verificationStatus,available:!busy.has(w.userId)})),
      body.requiredSkills,
    );
    return { ranked };
  }

  @Get("health")
  health() { return {module:"dispatch",status:"ok",note:"availability derives from current assignments"}; }
}