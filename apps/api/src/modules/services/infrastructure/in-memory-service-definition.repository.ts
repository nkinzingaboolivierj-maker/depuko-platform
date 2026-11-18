import { Injectable } from '@nestjs/common';
import { ServiceDefinition } from '../domain/entities/service-definition.entity';
import { ServiceDefinitionRepositoryPort } from '../domain/service-definition.repository.port';

/**
 * Placeholder persistence — replace once the database layer is chosen
 * (see /database/README.md). Never ship an in-memory store as production
 * functionality (§100).
 */
@Injectable()
export class InMemoryServiceDefinitionRepository implements ServiceDefinitionRepositoryPort {
  private readonly store = new Map<string, ServiceDefinition>();

  async save(definition: ServiceDefinition): Promise<void> {
    this.store.set(definition.id, definition);
  }

  async findById(id: string): Promise<ServiceDefinition | null> {
    return this.store.get(id) ?? null;
  }

  async findByCapabilities(capabilities: string[]): Promise<ServiceDefinition[]> {
    return [...this.store.values()].filter((def) =>
      capabilities.some((c) => def.capabilities.includes(c)),
    );
  }
}
