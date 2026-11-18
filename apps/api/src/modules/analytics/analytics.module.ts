import { Module } from "@nestjs/common";
import { PgAnalyticsRepository } from "./infrastructure/pg-analytics.repository";
import { AnalyticsController } from "./presentation/analytics.controller";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../security/infrastructure/guards/permission.guard";

@Module({
  imports: [AuthModule, UsersModule],
  providers: [PgAnalyticsRepository, AuthGuard, PermissionGuard],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}