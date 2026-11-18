import { Module } from "@nestjs/common";
import { PgDisputeRepository } from "./infrastructure/pg-dispute.repository";
import { DISPUTE_REPOSITORY } from "./domain/dispute.repository.port";
import { DisputesController } from "./presentation/disputes.controller";

@Module({
  providers: [{ provide: DISPUTE_REPOSITORY, useClass: PgDisputeRepository }],
  controllers: [DisputesController],
})
export class DisputesModule {}