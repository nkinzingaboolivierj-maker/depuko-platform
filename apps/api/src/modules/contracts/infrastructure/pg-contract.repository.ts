import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { ContractRepositoryPort, ContractRow } from "../domain/contract.repository.port";

/** Party-scoped access (BOLA in SQL): only a contract party can read it. */
@Injectable()
export class PgContractRepository implements ContractRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async save(row: ContractRow): Promise<void> {
    await this.db.query(
      `INSERT INTO contracts (id, version, terms, party_ids, status)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
      [row.id, row.version, JSON.stringify(row.terms ?? {}), row.party_ids, row.status],
    );
  }

  async findByIdForParty(id: string, partyId: string): Promise<ContractRow | null> {
    const rows = await this.db.query<ContractRow>(
      `SELECT id, version, terms, party_ids, status
       FROM contracts WHERE id = $1 AND $2 = ANY(party_ids)`,
      [id, partyId],
    );
    return rows[0] ?? null;
  }

  async listForParty(partyId: string): Promise<ContractRow[]> {
    return this.db.query<ContractRow>(
      `SELECT id, version, terms, party_ids, status FROM contracts WHERE $1 = ANY(party_ids) ORDER BY id DESC LIMIT 100`,
      [partyId],
    );
  }

  async requireForParty(id: string, partyId: string): Promise<ContractRow> {
    const row = await this.findByIdForParty(id, partyId);
    if (!row) throw new NotFoundException("contract not found");
    return row;
  }

  async saveSignature(contractId: string, partyId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO contract_signatures (id, contract_id, party_id) VALUES ($1, $2, $3)
       ON CONFLICT (contract_id, party_id) DO NOTHING`,
      ["sig_" + Math.random().toString(36).slice(2, 12), contractId, partyId],
    );
  }

  async countSignatures(contractId: string): Promise<number> {
    const rows = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM contract_signatures WHERE contract_id = $1`,
      [contractId],
    );
    return Number(rows[0]?.n ?? 0);
  }
}