import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SecurityModule } from "../security/security.module";
import { WorkforceModule } from "../workforce/workforce.module";
import { DispatchController } from "./presentation/dispatch.controller";

@Module({
  imports: [WorkforceModule, AuthModule, SecurityModule],
  controllers: [DispatchController],
})
export class DispatchModule {}