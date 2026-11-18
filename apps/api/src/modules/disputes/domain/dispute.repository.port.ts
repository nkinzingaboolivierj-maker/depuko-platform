export const DISPUTE_REPOSITORY = "DISPUTE_REPOSITORY";

export interface DisputeRow {
  id: string; order_ref: string; raised_by: string; against: string;
  category: string; status: string; payout_held: boolean; resolution: unknown;
}

export interface DisputeRepositoryPort {
  save(row: DisputeRow): Promise<void>;
  findByIdForParty(id: string, userId: string): Promise<DisputeRow | null>;
  findById(id: string): Promise<DisputeRow | null>;
  findByOrder(orderRef: string): Promise<DisputeRow[]>;
}