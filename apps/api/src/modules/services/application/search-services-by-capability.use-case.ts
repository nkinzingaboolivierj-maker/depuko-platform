import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_DEFINITION_REPOSITORY,
  ServiceDefinitionRepositoryPort,
} from '../domain/service-definition.repository.port';

/**
 * Backs the §69 golden test: discovery by capability, not by service name.
 * Public discovery only ever exposes PUBLISHED versions (§16) — a draft must
 * never be visible to a customer searching, regardless of what capabilities
 * it claims.
 */
@Injectable()
export class SearchServicesByCapabilityUseCase {
  constructor(
    @Inject(SERVICE_DEFINITION_REPOSITORY)
    private readonly repository: ServiceDefinitionRepositoryPort,
  ) {}

  async execute(capabilities: string[]) {
    const definitions = await this.repository.findByCapabilities(capabilities);

    return definitions
      .filter((def) => def.latestPublishedVersion !== undefined)
      .map((def) => {
        const version = def.latestPublishedVersion!;
        return {
          definitionId: def.id,
          domain: def.domain,
          category: def.category,
          capabilities: def.capabilities,
          type: version.type,
          configuration: version.configuration,
        };
      });
  }
}
