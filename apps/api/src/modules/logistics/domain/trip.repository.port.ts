export const TRIP_REPOSITORY = "TRIP_REPOSITORY";

export interface TripRow { id: string; organization_id: string; vehicle_asset_id: string; driver_user_id: string; status: string }
export interface StopRow { id: string; trip_id: string; order_ref: string; address: string; status: string; proof_of_delivery: string | null }

export interface TripRepositoryPort {
  saveTrip(row: TripRow): Promise<void>;
  saveStop(row: StopRow): Promise<void>;
  findTripForOrg(id: string, organizationId: string): Promise<TripRow | null>;
  listStops(tripId: string): Promise<StopRow[]>;
}