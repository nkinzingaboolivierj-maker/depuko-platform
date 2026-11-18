import { CreateServiceDraftUseCase } from '../application/create-service-draft.use-case';
import { PublishServiceVersionUseCase } from '../application/publish-service-version.use-case';
import { SearchServicesByCapabilityUseCase } from '../application/search-services-by-capability.use-case';
import { InMemoryServiceDefinitionRepository } from '../infrastructure/in-memory-service-definition.repository';
import { ServiceType } from '../domain/value-objects/service-type.enum';

describe('SearchServicesByCapabilityUseCase', () => {
  it('never exposes a draft (unpublished) service to public search', async () => {
    const repo = new InMemoryServiceDefinitionRepository();
    const createDraft = new CreateServiceDraftUseCase(repo);
    const search = new SearchServicesByCapabilityUseCase(repo);

    await createDraft.execute({
      domain: 'home-services',
      category: 'cleaning',
      capabilities: ['deep_cleaning'],
      type: ServiceType.HOURLY,
      configuration: { hourlyRate: 3000 },
    });

    const results = await search.execute(['deep_cleaning']);
    expect(results).toHaveLength(0);
  });

  it('exposes a published service by capability (§69)', async () => {
    const repo = new InMemoryServiceDefinitionRepository();
    const createDraft = new CreateServiceDraftUseCase(repo);
    const publish = new PublishServiceVersionUseCase(repo);
    const search = new SearchServicesByCapabilityUseCase(repo);

    const draft = await createDraft.execute({
      domain: 'home-services',
      category: 'pet-care',
      capabilities: ['pet_grooming', 'mobile_service'],
      type: ServiceType.FIXED_PRICE,
      configuration: { basePrice: 15000, currency: 'RWF' },
    });
    await publish.execute({ definitionId: draft.definitionId, versionId: draft.versionId });

    const results = await search.execute(['pet_grooming']);
    expect(results).toHaveLength(1);
    expect(results[0].definitionId).toBe(draft.definitionId);
  });
});
