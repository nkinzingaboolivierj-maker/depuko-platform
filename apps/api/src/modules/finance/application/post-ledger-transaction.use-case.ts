import { Inject, Injectable } from "@nestjs/common";
import { Entry } from "../domain/ledger";
import { LEDGER_REPOSITORY, LedgerRepositoryPort } from "../domain/ledger.repository.port";

/** Posts a balanced transaction or throws; idempotent on txId (S55). */
@Injectable()
export class PostLedgerTransactionUseCase {
  constructor(@Inject(LEDGER_REPOSITORY) private readonly ledger: LedgerRepositoryPort) {}

  async execute(params: { txId: string; description: string; reference?: string; entries: Entry[] }): Promise<{ txId: string; posted: boolean }> {
    return { txId: params.txId, posted: await this.ledger.post(params) };
  }
}