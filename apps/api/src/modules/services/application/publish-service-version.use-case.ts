import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SERVICE_DEFINITION_REPOSITORY,
  ServiceDefinitionRepositoryPort,
} from '../domain/service-definition.repository.port';

/**
 * Implements the publish step of the Service Builder (§14 step 15) subject to
 * simulation having passed (§15) and admin authorization (§14: "AI cannot
 * autonomously publish high-risk services") — authorization enforcement
 * itself is not yet wired in this scaffold; it must go through the security
 * module's policy engine before this use case is called, not inside it.
 */
@Injectable()
export class PublishServiceVersionUseCase {
  constructor(
    @Inject(SERVICE_DEFINITION_REPOSITORY)
    private readonly repository: ServiceDefinitionRepositoryPort,
  ) {}

  async execute(input: { definitionId: string; versionId: string }) {
    const definition = await this.repository.findById(input.definitionId);
    if (!definition) {
      throw new NotFoundException('Service definition not found');
    }
    const version = definition.allVersions.find((v) => v.id === input.versionId);
    if (!version) {
      throw new NotFoundException('Service version not found');
    }

    // Fail closed until the real service simulation suite is implemented.
    // Never manufacture a passing result merely to satisfy the domain guard.
    if (version.simulationStatus !== 'passed') {
      throw new BadRequestException(
        'Service publication is blocked: the required configuration/workforce/pricing/security simulation has not been executed and verified.',
      );
    }

    version.publish();
    await this.repository.save(definition);
    return { definitionId: definition.id, versionId: version.id, published: true };
  }
}
