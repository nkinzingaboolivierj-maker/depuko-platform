import { Body, Controller, Get, Param, Post, UseGuards, ForbiddenException, Inject } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { PROJECT_GRAPH_REPOSITORY, ProjectGraphRepositoryPort } from "../domain/project-graph.repository.port";

@Controller("projects")
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(@Inject(PROJECT_GRAPH_REPOSITORY) private readonly graphs: ProjectGraphRepositoryPort) {}

  @Get(":id/services")
  async listServices(@Param("id") projectId: string) {
    return { services: await this.graphs.listServices(projectId) };
  }

  @Post(":id/services")
  async addService(@Param("id") projectId: string, @Body() body: { serviceId: string; dependsOn: string[] }) {
    try {
      await this.graphs.addService(projectId, body.serviceId, body.dependsOn ?? []);
    } catch (e) {
      throw new ForbiddenException((e as Error).message);
    }
    return { projectId, serviceId: body.serviceId, added: true };
  }

  @Post(":id/services/:serviceId/status")
  async setStatus(@Param("id") projectId: string, @Param("serviceId") serviceId: string, @Body() body: { status: string }) {
    await this.graphs.setOrderStatus(projectId, serviceId, body.status);
    return { projectId, serviceId, status: body.status };
  }

  @Get(":id/readiness/:serviceId")
  async readiness(@Param("id") projectId: string, @Param("serviceId") serviceId: string) {
    return { projectId, serviceId, readiness: await this.graphs.readiness(projectId, serviceId) };
  }

  @Get(":id/downstream/:serviceId")
  async downstream(@Param("id") projectId: string, @Param("serviceId") serviceId: string) {
    return { projectId, serviceId, downstreamAffected: await this.graphs.downstreamAffected(projectId, serviceId) };
  }
}