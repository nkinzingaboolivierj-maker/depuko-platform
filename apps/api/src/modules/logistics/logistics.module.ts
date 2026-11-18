import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PgTripRepository } from "./infrastructure/pg-trip.repository";
import { TRIP_REPOSITORY } from "./domain/trip.repository.port";
import { LogisticsController } from "./presentation/logistics.controller";

@Module({
  imports: [AuthModule],
  providers: [{ provide: TRIP_REPOSITORY, useClass: PgTripRepository }, AuthGuard],
  controllers: [LogisticsController],
})
export class LogisticsModule {}