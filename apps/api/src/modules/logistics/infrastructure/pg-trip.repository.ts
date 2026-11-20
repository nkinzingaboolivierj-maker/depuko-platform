import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { TripRepositoryPort, TripRow, StopRow } from "../domain/trip.repository.port";

/** Real persistence. Every trip/stop read used by HTTP is scoped to an
 * organization member, assigned driver, or the order's customer. */
@Injectable()
export class PgTripRepository implements TripRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async saveTrip(row: TripRow): Promise<void> {
    await this.db.query(
      "INSERT INTO logistics_trips (id, organization_id, vehicle_asset_id, driver_user_id, status) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status",
      [row.id,row.organization_id,row.vehicle_asset_id,row.driver_user_id,row.status],
    );
  }

  async saveStop(row: StopRow): Promise<void> {
    await this.db.query(
      "INSERT INTO logistics_stops (id,trip_id,order_ref,address,status,proof_of_delivery,fail_reason) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status,proof_of_delivery=EXCLUDED.proof_of_delivery,fail_reason=EXCLUDED.fail_reason",
      [row.id,row.trip_id,row.order_ref,row.address,row.status,row.proof_of_delivery,row.fail_reason],
    );
  }

  async findTripForOrg(id: string, organizationId: string): Promise<TripRow | null> {
    const rows = await this.db.query<TripRow>(
      "SELECT t.id,t.organization_id,t.vehicle_asset_id,t.driver_user_id,t.status FROM logistics_trips t WHERE t.id=$1 AND t.organization_id=$2",
      [id,organizationId],
    );
    return rows[0] ?? null;
  }

  async findTripForUser(id: string, userId: string): Promise<TripRow | null> {
    const rows = await this.db.query<TripRow>(
      "SELECT t.id,t.organization_id,t.vehicle_asset_id,t.driver_user_id,t.status FROM logistics_trips t WHERE t.id=$1 AND (t.driver_user_id=$2 OR EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id=t.organization_id AND m.user_id=$2))",
      [id,userId],
    );
    return rows[0] ?? null;
  }

  async findStopForUser(id: string, userId: string): Promise<StopRow | null> {
    const rows = await this.db.query<StopRow>(
      "SELECT s.id,s.trip_id,s.order_ref,s.address,s.status,s.proof_of_delivery,s.fail_reason FROM logistics_stops s JOIN logistics_trips t ON t.id=s.trip_id WHERE s.id=$1 AND (t.driver_user_id=$2 OR EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id=t.organization_id AND m.user_id=$2))",
      [id,userId],
    );
    return rows[0] ?? null;
  }

  async listStops(tripId: string): Promise<StopRow[]> {
    return this.db.query<StopRow>(
      "SELECT id,trip_id,order_ref,address,status,proof_of_delivery,fail_reason FROM logistics_stops WHERE trip_id=$1 ORDER BY created_at",
      [tripId],
    );
  }
}