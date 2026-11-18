import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { AssetRepositoryPort, AssetRow, ReservationRow } from "../domain/asset.repository.port";

/** Double allocation is IMPOSSIBLE at the database level: migration 0011 has
 * an EXCLUDE USING gist constraint on (asset_id =, window &&). The insert
 * simply fails on overlap - no application race can beat it. */
@Injectable()
export class PgAssetRepository implements AssetRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async findByIdForOrg(id: string, organizationId: string): Promise<AssetRow | null> {
    const rows = await this.db.query<AssetRow>(
      `SELECT id, organization_id, kind, label, condition
       FROM assets WHERE id = $1 AND organization_id = $2`,
      [id, organizationId],
    );
    return rows[0] ?? null;
  }

  async reserve(params: { assetId: string; organizationId: string; reservedBy: string; start: Date; end: Date }): Promise<ReservationRow> {
    const asset = await this.findByIdForOrg(params.assetId, params.organizationId);
    if (!asset) throw new Error("asset not found for organization");
    if (asset.condition === "retired") throw new Error("retired assets cannot be reserved");
    const id = "res_" + Math.random().toString(36).slice(2, 12);
    await this.db.query(
      `INSERT INTO asset_reservations (id, asset_id, reserved_by, window)
       VALUES ($1, $2, $3, tstzrange($4, $5))`,
      [id, params.assetId, params.reservedBy, params.start, params.end],
    );
    return { id, asset_id: params.assetId, reserved_by: params.reservedBy, window_start: params.start.toISOString(), window_end: params.end.toISOString() };
  }
}