import { Module } from "@nestjs/common";
import { SecurityModule } from "../security/security.module";
import { BillingController } from "./presentation/billing.controller";

@Module({
  imports: [SecurityModule],
  controllers: [BillingController],
})
export class BillingModule {}