export const STOCK_REPOSITORY = "STOCK_REPOSITORY";

export interface StockRow {
  id: string; organization_id: string; name: string;
  quantity_total: number; quantity_reserved: number;
}

export interface StockRepositoryPort {
  findByIdForOrg(id: string, organizationId: string): Promise<StockRow | null>;
  reserve(id: string, organizationId: string, units: number): Promise<StockRow>;
  release(id: string, organizationId: string, units: number): Promise<void>;
}