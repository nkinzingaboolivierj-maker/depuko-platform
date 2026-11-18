import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PgOpportunityRepository } from "./infrastructure/pg-opportunity.repository";
import { PgSkillsRepository } from "../capabilities/infrastructure/pg-skills.repository";
import { PgWorkerRepository } from "../workforce/infrastructure/pg-worker.repository";
import { OpportunitiesController } from "./presentation/opportunities.controller";
@Module({ imports: [AuthModule], providers: [AuthGuard, PgOpportunityRepository, PgSkillsRepository, PgWorkerRepository], controllers: [OpportunitiesController] })
export class OpportunitiesModule {}
