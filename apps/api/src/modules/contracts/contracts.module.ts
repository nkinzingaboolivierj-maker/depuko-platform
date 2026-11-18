import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SecurityModule } from "../security/security.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PgContractRepository } from "./infrastructure/pg-contract.repository";
import { CONTRACT_REPOSITORY } from "./domain/contract.repository.port";
import { ContractsController } from "./presentation/contracts.controller";

@Module({
  imports: [AuthModule, SecurityModule],
  providers: [{ provide: CONTRACT_REPOSITORY, useClass: PgContractRepository }, AuthGuard],
  controllers: [ContractsController],
})
export class ContractsModule {}