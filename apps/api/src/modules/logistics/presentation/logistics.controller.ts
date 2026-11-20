import { randomUUID } from "node:crypto";
import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { TRIP_REPOSITORY, TripRepositoryPort, TripRow, StopRow } from "../domain/trip.repository.port";
import { Trip, Stop } from "../domain/trip";
import { DatabaseService } from "../../../infrastructure/database/database.service";

@Controller("logistics")
@UseGuards(AuthGuard)
export class LogisticsController {
  constructor(
    @Inject(TRIP_REPOSITORY) private readonly trips: TripRepositoryPort,
    private readonly db: DatabaseService,
  ) {}

  @Get("trips/mine")
  async mine(@Req() req: { userId: string }) {
    return { trips: await this.db.query(
      "SELECT t.id,t.organization_id,t.vehicle_asset_id,t.driver_user_id,t.status,t.created_at FROM logistics_trips t WHERE t.driver_user_id=$1 OR EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id=t.organization_id AND m.user_id=$1) ORDER BY t.created_at DESC LIMIT 100",
      [req.userId],
    ) };
  }

  @Post("trips")
  async createTrip(@Req() req: { userId: string }, @Body() body: { organizationId: string; vehicleId: string; driverUserId?: string }) {
    if (!body?.organizationId || !body.vehicleId) throw new BadRequestException("organizationId and vehicleId are required");
    await this.requireManager(body.organizationId, req.userId);
    const vehicle = await this.db.query<{ id: string }>(
      "SELECT id FROM assets WHERE id=$1 AND organization_id=$2 AND kind='vehicle' AND condition<>'retired'",
      [body.vehicleId,body.organizationId],
    );
    if (!vehicle.length) throw new NotFoundException("active vehicle asset not found for organization");
    const driverUserId = body.driverUserId ?? req.userId;
    const driver = await this.db.query<{ role: string }>(
      "SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2",
      [body.organizationId,driverUserId],
    );
    if (!driver.length || !["owner","admin","manager","employee","contractor"].includes(driver[0]!.role)) {
      throw new ForbiddenException("driver must be an authorized organization member");
    }
    const trip = new Trip("trip_" + randomUUID(),body.organizationId,body.vehicleId,driverUserId);
    await this.trips.saveTrip({id:trip.id,organization_id:trip.organizationId,vehicle_asset_id:trip.vehicleId,driver_user_id:trip.driverUserId,status:trip.status});
    return {tripId:trip.id,status:trip.status};
  }

  @Post("trips/:id/dispatch")
  async dispatch(@Param("id") id: string, @Req() req: { userId: string }) {
    const row = await this.requireTripForUser(id,req.userId);
    await this.requireManager(row.organization_id,req.userId);
    const trip = this.toTrip(row);
    try { trip.dispatch(); } catch (e) { throw new HttpException((e as Error).message,HttpStatus.CONFLICT); }
    await this.saveTrip(row,trip);
    return {tripId:id,status:trip.status};
  }

  @Post("trips/:id/start")
  async start(@Param("id") id: string, @Req() req: { userId: string }) {
    const row = await this.requireTripForUser(id,req.userId);
    await this.requireDriverOrManager(row,req.userId);
    const trip = this.toTrip(row);
    try { trip.start(); } catch (e) { throw new HttpException((e as Error).message,HttpStatus.CONFLICT); }
    await this.saveTrip(row,trip);
    return {tripId:id,status:trip.status};
  }

  @Post("trips/:id/stops")
  async addStop(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { orderRef: string; address: string }) {
    const row = await this.requireTripForUser(id,req.userId);
    await this.requireManager(row.organization_id,req.userId);
    if (row.status !== "planned") throw new HttpException("stops can only be added to planned trips",HttpStatus.CONFLICT);
    if (!body?.orderRef?.trim() || !body.address?.trim()) throw new BadRequestException("orderRef and address are required");
    const order = await this.db.query<{ id: string }>(
      "SELECT o.id FROM orders o JOIN assignments a ON a.order_id=o.id WHERE o.id=$1 AND a.worker_user_id=$2 AND a.status IN ('accepted','checked_in') AND o.status IN ('confirmed','in_progress') LIMIT 1",
      [body.orderRef.trim(),row.driver_user_id],
    );
    if (!order.length) throw new NotFoundException("order is not assigned to this trip driver");
    const stop = new Stop("stop_" + randomUUID(),id,body.orderRef.trim(),body.address.trim());
    await this.saveStop(stop);
    return {stopId:stop.id,status:stop.status};
  }

  @Get("trips/:id/stops")
  async listStops(@Param("id") id: string, @Req() req: { userId: string }) {
    await this.requireTripForUser(id,req.userId);
    return {stops:await this.trips.listStops(id)};
  }

  @Post("trips/:id/complete")
  async complete(@Param("id") id: string, @Req() req: { userId: string }) {
    const row = await this.requireTripForUser(id,req.userId);
    await this.requireDriverOrManager(row,req.userId);
    const stops = await this.trips.listStops(id);
    if (!stops.length || stops.some(stop=>stop.status!=="confirmed")) throw new HttpException("all delivery stops must be customer-confirmed before trip completion",HttpStatus.CONFLICT);
    const trip=this.toTrip(row);
    try{trip.complete()}catch(e){throw new HttpException((e as Error).message,HttpStatus.CONFLICT)}
    await this.saveTrip(row,trip);
    return {tripId:id,status:trip.status};
  }

  @Post("stops/:stopId/arrive")
  async arrive(@Param("stopId") stopId:string,@Req() req:{userId:string}) {
    const {stop,trip}=await this.requireStopAndTrip(stopId,req.userId);await this.requireDriverOrManager(trip,req.userId);
    try{stop.arrive()}catch(e){throw new HttpException((e as Error).message,HttpStatus.CONFLICT)}
    await this.saveStop(stop);return {stopId,status:stop.status};
  }

  @Post("stops/:stopId/load")
  async load(@Param("stopId") stopId:string,@Req() req:{userId:string}) {
    const {stop,trip}=await this.requireStopAndTrip(stopId,req.userId);await this.requireDriverOrManager(trip,req.userId);
    try{stop.load()}catch(e){throw new HttpException((e as Error).message,HttpStatus.CONFLICT)}
    await this.saveStop(stop);return {stopId,status:stop.status};
  }

  @Post("stops/:stopId/deliver")
  async deliver(@Param("stopId") stopId:string,@Req() req:{userId:string},@Body() body:{proof:string}) {
    const {stop,trip}=await this.requireStopAndTrip(stopId,req.userId);await this.requireDriverOrManager(trip,req.userId);
    try{stop.deliver(body?.proof)}catch(e){throw new HttpException((e as Error).message,HttpStatus.BAD_REQUEST)}
    await this.saveStop(stop);return {stopId,status:stop.status,proofAccepted:true};
  }

  @Post("stops/:stopId/fail")
  async fail(@Param("stopId") stopId:string,@Req() req:{userId:string},@Body() body:{reason:string}) {
    const {stop,trip}=await this.requireStopAndTrip(stopId,req.userId);await this.requireDriverOrManager(trip,req.userId);
    try{stop.fail(body?.reason?.trim()??"")}catch(e){throw new HttpException((e as Error).message,HttpStatus.BAD_REQUEST)}
    await this.saveStop(stop);return {stopId,status:stop.status};
  }

  @Post("stops/:stopId/reschedule")
  async reschedule(@Param("stopId") stopId:string,@Req() req:{userId:string}) {
    const {stop,trip}=await this.requireStopAndTrip(stopId,req.userId);await this.requireManager(trip.organization_id,req.userId);
    try{stop.reschedule()}catch(e){throw new HttpException((e as Error).message,HttpStatus.CONFLICT)}
    await this.saveStop(stop);return {stopId,status:stop.status};
  }

  @Post("stops/:stopId/confirm")
  async confirm(@Param("stopId") stopId:string,@Req() req:{userId:string}) {
    const rows=await this.db.query<StopRow>(
      "SELECT s.id,s.trip_id,s.order_ref,s.address,s.status,s.proof_of_delivery,s.fail_reason FROM logistics_stops s JOIN orders o ON o.id=s.order_ref WHERE s.id=$1 AND o.customer_id=$2",
      [stopId,req.userId],
    );
    if(!rows[0])throw new NotFoundException("delivery stop not found");
    const stop=this.toStop(rows[0]);
    try{stop.confirm()}catch(e){throw new HttpException((e as Error).message,HttpStatus.CONFLICT)}
    await this.saveStop(stop);return {stopId,status:stop.status};
  }

  private async requireManager(orgId:string,userId:string) {
    const rows=await this.db.query<{role:string}>("SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2",[orgId,userId]);
    if(!rows.length||!["owner","admin","manager"].includes(rows[0]!.role))throw new ForbiddenException("organization manager membership required");
  }
  private async requireTripForUser(id:string,userId:string):Promise<TripRow>{
    const row=await this.trips.findTripForUser(id,userId);if(!row)throw new NotFoundException("trip not found");return row;
  }
  private async requireDriverOrManager(row:TripRow,userId:string){
    if(row.driver_user_id===userId)return;
    await this.requireManager(row.organization_id,userId);
  }
  private async requireStopAndTrip(id:string,userId:string){
    const row=await this.trips.findStopForUser(id,userId);if(!row)throw new NotFoundException("delivery stop not found");
    const trip=await this.requireTripForUser(row.trip_id,userId);
    return {stop:this.toStop(row),trip};
  }
  private toTrip(row:TripRow){return new Trip(row.id,row.organization_id,row.vehicle_asset_id,row.driver_user_id,row.status)}
  private toStop(row:StopRow){const stop=new Stop(row.id,row.trip_id,row.order_ref,row.address,row.status);stop.proofOfDelivery=row.proof_of_delivery;stop.failReason=row.fail_reason;return stop}
  private async saveTrip(row:TripRow,trip:Trip){await this.trips.saveTrip({...row,status:trip.status})}
  private async saveStop(stop:Stop){await this.trips.saveStop({id:stop.id,trip_id:stop.tripId,order_ref:stop.orderRef,address:stop.address,status:stop.status,proof_of_delivery:stop.proofOfDelivery,fail_reason:stop.failReason})}
}