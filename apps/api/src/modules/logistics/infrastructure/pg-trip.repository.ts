import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { TripRepositoryPort, TripRow, StopRow } from "../domain/trip.repository.port";

/** Real persistence (migration 0012 tables). Org-scoped reads: BOLA in SQL. */
@Injectable()
export class PgTripRepository implements TripRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async saveTrip(row: TripRow): Promise<void> {
    await this.db.query(
      `INSERT INTO logistics_trips (id, organization_id, vehicle_asset_id, driver_user_id, status)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
      [row.id, row.organization_id, row.vehicle_asset_id, row.driver_user_id, row.status],
    );
  }

  async saveStop(row: StopRow): Promise<void> {
    await this.db.query(
      `INSERT INTO logistics_stops (id, trip_id, order_ref, address, status, proof_of_delivery)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, proof_of_delivery = EXCLUDED.proof_of_delivery`,
      [row.id, row.trip_id, row.order_ref, row.address, row.status, row.proof_of_delivery],
    );
  }

  async findTripForOrg(id: string, organizationId: string): Promise<TripRow | null> {
    const rows = await this.db.query<TripRow>(
      `SELECT id, organization_id, vehicle_asset_id, driver_user_id, status
       FROM logistics_trips WHERE id = $1 AND organization_id = $2`,
      [id, organizationId],
    );
    return rows[0] ?? null;
  }

  async requireTripForOrg(id: string, organizationId: string): Promise<TripRow> {
    const row = await this.findTripForOrg(id, organizationId);
    if (!row) throw new NotFoundException("trip not found");
    return row;
  }

  async listStops(tripId: string): Promise<StopRow[]> {
    return this.db.query<StopRow>(
      `SELECT id, trip_id, order_ref, address, status, proof_of_delivery
       FROM logistics_stops WHERE trip_id = $1 ORDER BY created_at`,
      [tripId],
    );
  }
}