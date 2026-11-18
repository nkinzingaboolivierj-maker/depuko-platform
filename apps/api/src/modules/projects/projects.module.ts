import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SecurityModule } from "../security/security.module";
import { ProjectsController } from "./presentation/projects.controller";
import { PgProjectGraphRepository } from "./infrastructure/pg-project-graph.repository";
import { PROJECT_GRAPH_REPOSITORY } from "./domain/project-graph.repository.port";

@Module({
  imports: [AuthModule, SecurityModule],
  providers: [{ provide: PROJECT_GRAPH_REPOSITORY, useClass: PgProjectGraphRepository }],
  controllers: [ProjectsController],
})
export class ProjectsModule {}