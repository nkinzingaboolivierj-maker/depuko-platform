import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';

/**
 * Boots the real dependency-injection graph (all four implemented modules,
 * their guards, and DatabaseService) without opening an HTTP listener or
 * requiring a reachable Postgres instance — pg's Pool is lazy, so
 * constructing it in DatabaseService.onModuleInit does not connect until a
 * query actually runs. This test exists specifically to catch DI wiring
 * mistakes (missing providers, circular imports) that tsc alone won't catch.
 */
describe('AppModule', () => {
  it('resolves the full dependency injection graph', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});
