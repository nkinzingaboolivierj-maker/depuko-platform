import { CreateServiceDraftUseCase } from '../application/create-service-draft.use-case';
import { PublishServiceVersionUseCase } from '../application/publish-service-version.use-case';
import { InMemoryServiceDefinitionRepository } from '../infrastructure/in-memory-service-definition.repository';
import { ServiceType } from '../domain/value-objects/service-type.enum';

describe('Universal Service Engine — publish flow', () => {
  it('fails closed while the real service simulation suite is unavailable', async () => {
    const repo = new InMemoryServiceDefinitionRepository();
    const createDraft = new CreateServiceDraftUseCase(repo);
    const publish = new PublishServiceVersionUseCase(repo);

    const draft = await createDraft.execute({
      domain: 'home-services',
      category: 'pet-care',
      capabilities: ['pet_grooming', 'mobile_service'],
      type: ServiceType.FIXED_PRICE,
      configuration: { basePrice: 15000, currency: 'RWF' },
    });

    await expect(publish.execute({
      definitionId: draft.definitionId,
      versionId: draft.versionId,
    })).rejects.toThrow(/simulation has not been executed and verified/i);
  });

  it('golden universal service test: a new service is discoverable by capability, not by name (§69)', async () => {
    const repo = new InMemoryServiceDefinitionRepository();
    const createDraft = new CreateServiceDraftUseCase(repo);

    await createDraft.execute({
      domain: 'home-services',
      category: 'pet-care',
      capabilities: ['pet_grooming', 'mobile_service'],
      type: ServiceType.FIXED_PRICE,
      configuration: { basePrice: 15000, currency: 'RWF' },
    });

    const matches = await repo.findByCapabilities(['pet_grooming']);
    expect(matches.length).toBe(1);
  });
});
