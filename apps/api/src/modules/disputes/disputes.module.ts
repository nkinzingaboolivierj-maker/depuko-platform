import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../security/infrastructure/guards/permission.guard";
import { PgDisputeRepository } from "./infrastructure/pg-dispute.repository";
import { DISPUTE_REPOSITORY } from "./domain/dispute.repository.port";
import { DisputesController } from "./presentation/disputes.controller";

@Module({
  imports: [AuthModule, UsersModule],
  providers: [{ provide: DISPUTE_REPOSITORY, useClass: PgDisputeRepository }, AuthGuard, PermissionGuard],
  controllers: [DisputesController],
})
export class DisputesModule {}