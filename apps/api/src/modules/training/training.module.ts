import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { SecurityModule } from "../security/security.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../security/infrastructure/guards/permission.guard";
import { TrainingController } from "./presentation/training.controller";

@Module({
  imports: [SecurityModule, AuthModule, UsersModule],
  controllers: [TrainingController],
  providers: [AuthGuard, PermissionGuard],
})
export class TrainingModule {}
