export const ASSET_REPOSITORY = "ASSET_REPOSITORY";

export interface AssetRow { id: string; organization_id: string; kind: string; label: string; condition: string }
export interface ReservationRow { id: string; asset_id: string; reserved_by: string; window_start: string; window_end: string }

export interface AssetRepositoryPort {
  findByIdForOrg(id: string, organizationId: string): Promise<AssetRow | null>;
  reserve(params: { assetId: string; organizationId: string; reservedBy: string; start: Date; end: Date }): Promise<ReservationRow>;
}