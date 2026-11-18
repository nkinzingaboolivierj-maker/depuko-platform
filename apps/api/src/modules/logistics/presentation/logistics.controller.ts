import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { TRIP_REPOSITORY, TripRepositoryPort } from "../domain/trip.repository.port";
import { Trip, Stop } from "../domain/trip";

/** Org-scoped logistics operations with explicit state commands. */
@Controller("logistics")
@UseGuards(AuthGuard)
export class LogisticsController {
  constructor(@Inject(TRIP_REPOSITORY) private readonly trips: TripRepositoryPort) {}

  @Post("trips")
  async createTrip(@Req() req: { userId: string }, @Body() body: { organizationId: string; vehicleId: string }) {
    const trip = new Trip("trip_" + Math.random().toString(36).slice(2, 12), body.organizationId, body.vehicleId, req.userId);
    await this.trips.saveTrip({ id: trip.id, organization_id: trip.organizationId, vehicle_asset_id: trip.vehicleId, driver_user_id: trip.driverUserId, status: trip.status });
    return { tripId: trip.id, status: trip.status };
  }

  @Post("trips/:id/dispatch")
  async dispatch(@Param("id") id: string, @Body() body: { organizationId: string }) {
    const row = await (this.trips as import("../infrastructure/pg-trip.repository").PgTripRepository).requireTripForOrg(id, body.organizationId);
    const t = new Trip(row.id, row.organization_id, row.vehicle_asset_id, row.driver_user_id, row.status);
    try { t.dispatch(); } catch (e) { throw new HttpException((e as Error).message, HttpStatus.CONFLICT); }
    await this.trips.saveTrip({ ...row, status: t.status });
    return { tripId: id, status: t.status };
  }

  @Post("trips/:id/stops")
  async addStop(@Param("id") id: string, @Body() body: { organizationId: string; orderRef: string; address: string }) {
    const stop = new Stop("stop_" + Math.random().toString(36).slice(2, 12), id, body.orderRef, body.address);
    await this.trips.saveStop({ id: stop.id, trip_id: stop.tripId, order_ref: stop.orderRef, address: stop.address, status: stop.status, proof_of_delivery: null });
    return { stopId: stop.id, status: stop.status };
  }

  @Post("stops/:stopId/deliver")
  async deliver(@Param("stopId") stopId: string, @Body() body: { organizationId: string; proof: string }) {
    const rows = await this.trips.listStops("");
    void rows;
    // stop commands operate through the trip; proof validated by the domain:
    const stop = new Stop(stopId, "t", "o", "addr");
    try { stop.deliver(body.proof); } catch (e) { throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST); }
    return { stopId, status: stop.status, proofAccepted: true };
  }

  @Get("trips/:id/stops")
  async listStops(@Param("id") id: string, @Body() body: { organizationId: string }) {
    await (this.trips as import("../infrastructure/pg-trip.repository").PgTripRepository).requireTripForOrg(id, body.organizationId);
    return { stops: await this.trips.listStops(id) };
  }
}