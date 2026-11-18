import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { WorkforceModule } from "../workforce/workforce.module";
import { DispatchController } from "./presentation/dispatch.controller";

@Module({
  imports: [WorkforceModule, AuthModule],
  providers: [AuthGuard],
  controllers: [DispatchController],
})
export class DispatchModule {}