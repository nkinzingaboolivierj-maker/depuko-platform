import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject, NotFoundException } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { CONTRACT_REPOSITORY, ContractRepositoryPort } from "../domain/contract.repository.port";
import { Contract } from "../domain/contract";

/** Versioned contracts over HTTP: draft -> send -> sign (all parties) ->
 * signed. Signed contracts are immutable; changes go through supersede. */
@Controller("contracts")
@UseGuards(AuthGuard)
export class ContractsController {
  constructor(@Inject(CONTRACT_REPOSITORY) private readonly contracts: ContractRepositoryPort) {}

  @Post()
  async create(@Req() req: { userId: string }, @Body() body: { partyIds: string[]; terms?: Record<string, unknown> }) {
    if (!body.partyIds || body.partyIds.length < 2) {
      throw new HttpException("contracts need at least two parties", HttpStatus.BAD_REQUEST);
    }
    if (!body.partyIds.includes(req.userId)) throw new HttpException("creator must be a contract party", HttpStatus.FORBIDDEN);
    const c = new Contract("ctr_" + Math.random().toString(36).slice(2, 12), 1, body.terms ?? {}, body.partyIds);
    await this.contracts.save({ id: c.id, version: c.version, terms: c.terms, party_ids: c.partyIds, status: c.status });
    return { contractId: c.id, version: c.version, status: c.status };
  }

  @Get()
  async mine(@Req() req: { userId: string }) {
    return { contracts: await this.contracts.listForParty(req.userId) };
  }

  @Post(":id/send")
  async send(@Param("id") id: string, @Req() req: { userId: string }) {
    const repo = this.contracts as import("../infrastructure/pg-contract.repository").PgContractRepository;
    const row = await repo.requireForParty(id, req.userId);
    const c = new Contract(row.id, row.version, row.terms as Record<string, unknown>, row.party_ids, row.status as never);
    try { c.send(); } catch (e) { throw new HttpException((e as Error).message, HttpStatus.CONFLICT); }
    await this.contracts.save({ ...row, status: c.status });
    return { contractId: id, status: c.status };
  }

  @Post(":id/sign")
  async sign(@Param("id") id: string, @Req() req: { userId: string }) {
    const repo = this.contracts as import("../infrastructure/pg-contract.repository").PgContractRepository;
    const row = await repo.requireForParty(id, req.userId);
    if (row.status !== "sent") throw new HttpException("only sent contracts can be signed", HttpStatus.CONFLICT);
    await this.contracts.saveSignature(id, req.userId);
    const signatures = await this.contracts.countSignatures(id);
    if (signatures >= row.party_ids.length) {
      await this.contracts.save({ ...row, status: "signed" });
      return { contractId: id, status: "signed" };
    }
    return { contractId: id, status: "sent", signatures, needed: row.party_ids.length };
  }

  @Get(":id")
  async get(@Param("id") id: string, @Req() req: { userId: string }) {
    const row = await this.contracts.findByIdForParty(id, req.userId);
    if (!row) throw new NotFoundException("contract not found");
    const signatures = await this.contracts.countSignatures(id);
    return { ...row, signatures };
  }
}