import { Module } from "@nestjs/common";
import { PgTripRepository } from "./infrastructure/pg-trip.repository";
import { TRIP_REPOSITORY } from "./domain/trip.repository.port";
import { LogisticsController } from "./presentation/logistics.controller";

@Module({
  providers: [{ provide: TRIP_REPOSITORY, useClass: PgTripRepository }],
  controllers: [LogisticsController],
})
export class LogisticsModule {}