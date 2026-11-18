import { Module } from "@nestjs/common";
import { PgAnalyticsRepository } from "./infrastructure/pg-analytics.repository";
import { AnalyticsController } from "./presentation/analytics.controller";

@Module({
  providers: [PgAnalyticsRepository],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}