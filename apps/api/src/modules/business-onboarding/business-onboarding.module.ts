import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { BusinessOnboardingController } from "./presentation/business-onboarding.controller";
import { PgOnboardingRepository } from "./infrastructure/pg-onboarding.repository";
@Module({ imports: [AuthModule], controllers: [BusinessOnboardingController], providers: [AuthGuard, PgOnboardingRepository], exports: [PgOnboardingRepository] })
export class BusinessOnboardingModule {}
