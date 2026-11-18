import { Inject, Injectable } from '@nestjs/common';
import { ServiceDefinition } from '../domain/entities/service-definition.entity';
import { ServiceType } from '../domain/value-objects/service-type.enum';
import {
  SERVICE_DEFINITION_REPOSITORY,
  ServiceDefinitionRepositoryPort,
} from '../domain/service-definition.repository.port';

interface CreateServiceDraftInput {
  domain: string;
  category: string;
  capabilities: string[];
  type: ServiceType;
  configuration: Record<string, unknown>;
}

/**
 * Backs the Service Builder (§14) steps "Outcome → Capabilities → ... →
 * Pricing → Scheduling → Workflow". This scaffold only models the identity +
 * type + raw configuration bag — the real builder needs each step (inputs,
 * options, resources, workforce, security, compliance) as its own validated
 * shape, not an untyped Record.
 */
@Injectable()
export class CreateServiceDraftUseCase {
  constructor(
    @Inject(SERVICE_DEFINITION_REPOSITORY)
    private readonly repository: ServiceDefinitionRepositoryPort,
  ) {}

  async execute(input: CreateServiceDraftInput) {
    const definition = ServiceDefinition.create({
      id: `svc_${Math.random().toString(36).slice(2)}`,
      domain: input.domain,
      category: input.category,
      capabilities: input.capabilities,
    });
    const version = definition.addDraftVersion(input.type, input.configuration);
    await this.repository.save(definition);
    return { definitionId: definition.id, versionId: version.id };
  }
}
