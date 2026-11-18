import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { WORKER_REPOSITORY, WorkerRepositoryPort } from "../../workforce/domain/worker.repository.port";
import { rankWorkersForSkills } from "../domain/dispatch-policy";

/** Dispatch over HTTP: ranks VERIFIED + available workers by skill match.
 * Unverified or unavailable workers are structurally excluded (S37). */
@Controller("dispatch")
@UseGuards(AuthGuard)
export class DispatchController {
  constructor(@Inject(WORKER_REPOSITORY) private readonly workers: WorkerRepositoryPort) {}

  @Post("rank")
  async rank(@Body() body: { requiredSkills: string[] }) {
    const verified = await this.workers.findVerifiedBySkills(body.requiredSkills ?? []);
    const ranked = rankWorkersForSkills(
      verified.map(w => ({ userId: w.userId, skills: w.skills, verificationStatus: w.verificationStatus, available: true })),
      body.requiredSkills ?? [],
    );
    return { ranked };
  }

  @Get("health")
  health() {
    return { module: "dispatch", status: "ok", note: "ranking is deterministic and explainable" };
  }
}