import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../security/infrastructure/guards/permission.guard";
import { PgTrustCaseRepository } from "./infrastructure/pg-case.repository";
import { TRUST_CASE_REPOSITORY } from "./domain/case.repository.port";
import { TrustController } from "./presentation/trust.controller";

@Module({
  imports: [AuthModule, UsersModule],
  providers: [{ provide: TRUST_CASE_REPOSITORY, useClass: PgTrustCaseRepository }, AuthGuard, PermissionGuard],
  controllers: [TrustController],
})
export class TrustModule {}