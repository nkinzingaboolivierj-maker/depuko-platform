import { Module } from "@nestjs/common";
import { PgSkillsRepository } from "./infrastructure/pg-skills.repository";
import { SkillsController } from "./presentation/skills.controller";

@Module({
  providers: [PgSkillsRepository],
  controllers: [SkillsController],
})
export class CapabilitiesModule {}