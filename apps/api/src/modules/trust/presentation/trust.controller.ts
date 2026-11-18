import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject, NotFoundException } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../../security/infrastructure/guards/permission.guard";
import { RequirePermission } from "../../security/infrastructure/guards/require-permission.decorator";
import { TRUST_CASE_REPOSITORY, TrustCaseRepositoryPort } from "../domain/case.repository.port";
import { VerificationCase } from "../domain/verification-case";

/** PHASE 5: investigations are opened by reports; RESTRICTIONS are
 * admin-gated human decisions with mandatory rationale (S36). */
@Controller("trust")
@UseGuards(AuthGuard)
export class TrustController {
  constructor(@Inject(TRUST_CASE_REPOSITORY) private readonly cases: TrustCaseRepositoryPort) {}

  @Post("cases")
  async open(@Req() req: { userId: string }, @Body() body: { kind: "identity" | "business" | "worker_credential" | "fraud" | "safety_incident" | "report"; subjectId: string }) {
    const subjectId = body.kind === "safety_incident" ? req.userId : body.subjectId;
    if (!subjectId) throw new HttpException("subjectId required", HttpStatus.BAD_REQUEST);
    const c = new VerificationCase("tc_" + Math.random().toString(36).slice(2, 12), body.kind, subjectId);
    await this.cases.save({ id: c.id, kind: c.kind, subject_id: c.subjectId, status: c.status, decided_by: null, rationale: null });
    return { caseId: c.id, status: c.status };
  }

  @Post("cases/:id/restrict")
  @UseGuards(PermissionGuard)
  @RequirePermission("workers:suspend")
  async restrict(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { rationale: string }) {
    const row = await this.cases.findById(id);
    if (!row) throw new NotFoundException("case not found");
    const c = new VerificationCase(row.id, row.kind as never, row.subject_id, row.status);
    try { c.resolveRestriction(req.userId, body.rationale); } catch (e) { throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST); }
    await this.cases.save({ ...row, status: c.status, decided_by: req.userId, rationale: body.rationale });
    return { caseId: id, status: c.status };
  }

  @Get("cases/:id")
  @UseGuards(PermissionGuard)
  @RequirePermission("workers:suspend")
  async get(@Param("id") id: string) {
    const row = await this.cases.findById(id);
    if (!row) throw new NotFoundException("case not found");
    return row;
  }
}