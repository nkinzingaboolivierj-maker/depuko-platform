import { CreateServiceDraftUseCase } from '../application/create-service-draft.use-case';
import { PublishServiceVersionUseCase } from '../application/publish-service-version.use-case';
import { SearchServicesByCapabilityUseCase } from '../application/search-services-by-capability.use-case';
import { InMemoryServiceDefinitionRepository } from '../infrastructure/in-memory-service-definition.repository';
import { ServiceType } from '../domain/value-objects/service-type.enum';
import { ServiceDefinition } from '../domain/entities/service-definition.entity';
import { ServiceVersion } from '../domain/entities/service-version.entity';

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

  it('blocks publishing until the real simulation suite has passed', async () => {
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

    await expect(publish.execute({ definitionId: draft.definitionId, versionId: draft.versionId }))
      .rejects.toThrow(/publication is blocked/i);
    const unchanged = await repo.findById(draft.definitionId);
    expect(unchanged?.latestPublishedVersion).toBeUndefined();
  });

  it('exposes an already-verified published service by capability (§69)', async () => {
    const repo = new InMemoryServiceDefinitionRepository();
    const definitionId = 'svc_verified_pet_care';
    // This fixture represents a row rehydrated by the persistence adapter
    // after the real configuration/workforce/pricing/security simulation passed.
    const version = ServiceVersion.restore({
      id: definitionId + '_v1',
      serviceDefinitionId: definitionId,
      versionNumber: 1,
      type: ServiceType.FIXED_PRICE,
      configuration: { basePrice: 15000, currency: 'RWF' },
      simulationStatus: 'passed',
      publishedAt: new Date('2026-11-20T10:00:00.000Z'),
    });
    const definition = ServiceDefinition.restore({
      id: definitionId,
      domain: 'home-services',
      category: 'pet-care',
      capabilities: ['pet_grooming', 'mobile_service'],
      versions: [version],
    });
    await repo.save(definition);

    const results = await new SearchServicesByCapabilityUseCase(repo).execute(['pet_grooming']);
    expect(results).toHaveLength(1);
    expect(results[0].definitionId).toBe(definitionId);
  });
});
