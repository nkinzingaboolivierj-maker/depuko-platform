import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { StockRepositoryPort, StockRow } from "../domain/stock.repository.port";

/** Concurrency-safe reservations: SELECT ... FOR UPDATE row lock inside a
 * transaction means two concurrent reserve calls can never oversell. */
@Injectable()
export class PgStockRepository implements StockRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async findByIdForOrg(id: string, organizationId: string): Promise<StockRow | null> {
    const rows = await this.db.query<StockRow>(
      `SELECT id, organization_id, name, quantity_total, quantity_reserved
       FROM stock_items WHERE id = $1 AND organization_id = $2`,
      [id, organizationId],
    );
    return rows[0] ? this.normalize(rows[0]) : null;
  }

  async reserve(id: string, organizationId: string, units: number): Promise<StockRow> {
    return this.db.withTransaction(async q => {
      const locked = await q<StockRow>(
        `SELECT id, organization_id, name, quantity_total, quantity_reserved
         FROM stock_items WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [id, organizationId],
      );
      const row = locked[0];
      if (!row) throw new NotFoundException("stock item not found");
      const available = Number(row.quantity_total) - Number(row.quantity_reserved);
      if (units <= 0 || units > available) {
        throw new Error("INSUFFICIENT STOCK - cannot oversell (row locked, no race)");
      }
      await q(`UPDATE stock_items SET quantity_reserved = quantity_reserved + $3 WHERE id = $1 AND organization_id = $2`,
        [id, organizationId, units]);
      return { ...this.normalize(row), quantity_reserved: Number(row.quantity_reserved) + units };
    });
  }

  async release(id: string, organizationId: string, units: number): Promise<void> {
    if (!Number.isSafeInteger(units) || units <= 0) throw new Error("release units must be a positive integer");
    await this.db.withTransaction(async q => {
      const locked = await q<StockRow>(
        `SELECT id, organization_id, name, quantity_total, quantity_reserved
         FROM stock_items WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [id, organizationId],
      );
      const row = locked[0];
      if (!row) throw new NotFoundException("stock item not found");
      if (Number(row.quantity_reserved) < units) throw new Error("cannot release more than the reserved quantity");
      await q(`UPDATE stock_items SET quantity_reserved = quantity_reserved - $3 WHERE id = $1 AND organization_id = $2`,
        [id, organizationId, units]);
    });
  }

  private normalize(row: StockRow): StockRow {
    return { ...row, quantity_total: Number(row.quantity_total), quantity_reserved: Number(row.quantity_reserved) };
  }
}
