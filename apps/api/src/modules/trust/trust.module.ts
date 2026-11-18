import { Module } from "@nestjs/common";
import { PgTrustCaseRepository } from "./infrastructure/pg-case.repository";
import { TRUST_CASE_REPOSITORY } from "./domain/case.repository.port";
import { TrustController } from "./presentation/trust.controller";

@Module({
  providers: [{ provide: TRUST_CASE_REPOSITORY, useClass: PgTrustCaseRepository }],
  controllers: [TrustController],
})
export class TrustModule {}