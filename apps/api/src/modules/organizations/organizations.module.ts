import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { OrganizationsController } from "./presentation/organizations.controller";
@Module({ imports: [AuthModule], controllers: [OrganizationsController], providers: [AuthGuard] })
export class OrganizationsModule {}
