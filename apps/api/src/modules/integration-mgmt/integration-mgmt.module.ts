import { Module } from "@nestjs/common";
import { PgIntegrationRepository } from "./infrastructure/pg-integration.repository";
import { IntegrationsController } from "./presentation/integrations.controller";

@Module({
  providers: [PgIntegrationRepository],
  controllers: [IntegrationsController],
})
export class IntegrationMgmtModule {}