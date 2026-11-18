import { Module } from "@nestjs/common";
import { PgSkillsRepository } from "./infrastructure/pg-skills.repository";
import { SkillsController } from "./presentation/skills.controller";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../security/infrastructure/guards/permission.guard";

@Module({
  imports: [AuthModule, UsersModule],
  providers: [PgSkillsRepository, AuthGuard, PermissionGuard],
  controllers: [SkillsController],
})
export class CapabilitiesModule {}