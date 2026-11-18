export const CONTRACT_REPOSITORY = "CONTRACT_REPOSITORY";

export interface ContractRow {
  id: string; version: number; terms: unknown; party_ids: string[]; status: string;
}

export interface ContractRepositoryPort {
  save(row: ContractRow): Promise<void>;
  findByIdForParty(id: string, partyId: string): Promise<ContractRow | null>;
  listForParty(partyId: string): Promise<ContractRow[]>;
  saveSignature(contractId: string, partyId: string): Promise<void>;
  countSignatures(contractId: string): Promise<number>;
}