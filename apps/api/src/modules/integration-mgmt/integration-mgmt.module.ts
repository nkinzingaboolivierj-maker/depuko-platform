import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../security/infrastructure/guards/permission.guard";
import { PgIntegrationRepository } from "./infrastructure/pg-integration.repository";
import { IntegrationsController } from "./presentation/integrations.controller";

@Module({
  imports: [AuthModule, UsersModule],
  providers: [PgIntegrationRepository, AuthGuard, PermissionGuard],
  controllers: [IntegrationsController],
})
export class IntegrationMgmtModule {}