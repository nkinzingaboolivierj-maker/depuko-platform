import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CreateServiceDraftUseCase } from '../application/create-service-draft.use-case';
import { PublishServiceVersionUseCase } from '../application/publish-service-version.use-case';
import { SearchServicesByCapabilityUseCase } from '../application/search-services-by-capability.use-case';
import { ServiceType } from '../domain/value-objects/service-type.enum';
import { AuthGuard } from '../../security/infrastructure/guards/auth.guard';
import { PermissionGuard } from '../../security/infrastructure/guards/permission.guard';
import { RequirePermission } from '../../security/infrastructure/guards/require-permission.decorator';

/**
 * Matches the critical-command style from §54 — POST /services/:id/publish —
 * rather than a generic PATCH that could silently mutate published versions.
 */
@Controller('services')
export class ServiceDefinitionsController {
  constructor(
    private readonly createDraft: CreateServiceDraftUseCase,
    private readonly publishVersion: PublishServiceVersionUseCase,
    private readonly searchServices: SearchServicesByCapabilityUseCase,
  ) {}

  /**
   * Public discovery (§69 golden test) — no auth required, matches the
   * customer-facing "find by capability, not by name" flow. Only ever
   * returns published versions (enforced in the use case, not here).
   */
  @Get()
  async search(@Query('capability') capability?: string) {
    if (!capability) return [];
    return this.searchServices.execute([capability]);
  }

  @Post()
  @UseGuards(AuthGuard)
  async createDraftService(
    @Body()
    body: {
      domain: string;
      category: string;
      capabilities: string[];
      type: ServiceType;
      configuration: Record<string, unknown>;
    },
  ) {
    return this.createDraft.execute(body);
  }

  /**
   * Publishing is high-risk (§14: "AI cannot autonomously publish high-risk
   * services"; §47 lists service publication as requiring authorization).
   * This is now real: AuthGuard resolves a real session, PermissionGuard
   * checks the real user's roles against the security module's policy table.
   */
  @Post(':id/publish')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission('services:publish')
  async publish(@Param('id') definitionId: string, @Body() body: { versionId: string }) {
    return this.publishVersion.execute({ definitionId, versionId: body.versionId });
  }
}
