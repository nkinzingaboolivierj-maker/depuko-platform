import { ServiceDefinition } from './entities/service-definition.entity';

export interface ServiceDefinitionRepositoryPort {
  save(definition: ServiceDefinition): Promise<void>;
  findById(id: string): Promise<ServiceDefinition | null>;
  findByCapabilities(capabilities: string[]): Promise<ServiceDefinition[]>;
}

export const SERVICE_DEFINITION_REPOSITORY = Symbol('SERVICE_DEFINITION_REPOSITORY');
