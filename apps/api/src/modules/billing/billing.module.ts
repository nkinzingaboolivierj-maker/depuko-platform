import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { SecurityModule } from "../security/security.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../security/infrastructure/guards/permission.guard";
import { BillingController } from "./presentation/billing.controller";

@Module({
  imports: [SecurityModule, AuthModule, UsersModule],
  controllers: [BillingController],
  providers: [AuthGuard, PermissionGuard],
})
export class BillingModule {}
