import { Module } from '@nestjs/common';
import { ServiceDefinitionsController } from './presentation/service-definitions.controller';
import { CreateServiceDraftUseCase } from './application/create-service-draft.use-case';
import { PublishServiceVersionUseCase } from './application/publish-service-version.use-case';
import { SearchServicesByCapabilityUseCase } from './application/search-services-by-capability.use-case';
import { SERVICE_DEFINITION_REPOSITORY } from './domain/service-definition.repository.port';
import { PgServiceDefinitionRepository } from './infrastructure/pg-service-definition.repository';
import { SecurityModule } from '../security/security.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AuthGuard } from '../security/infrastructure/guards/auth.guard';
import { PermissionGuard } from '../security/infrastructure/guards/permission.guard';

/**
 * Services module — the Universal Service Engine (§12). This is the module
 * every other domain (onboarding, quotes, orders, scheduling...) reads
 * configuration from. A "new service" should normally mean a new
 * ServiceDefinition + ServiceVersion here, not a new frontend page or a new
 * backend module (§4, §95).
 *
 * Persistence is real (PgServiceDefinitionRepository, Postgres via
 * DatabaseService). Publishing is authorization-gated via AuthGuard +
 * PermissionGuard (see infrastructure/in-memory-service-definition.repository.ts
 * for the fake used in unit tests only — §100).
 *
 * AuthModule/UsersModule are imported directly (in addition to
 * SecurityModule) because @UseGuards() resolves class-reference guards
 * against the consuming module's own injector — the guards' own
 * dependencies (SESSION_REPOSITORY, USER_REPOSITORY) need to be visible
 * here, not just to SecurityModule itself.
 */
@Module({
  imports: [SecurityModule, AuthModule, UsersModule],
  controllers: [ServiceDefinitionsController],
  providers: [
    CreateServiceDraftUseCase,
    PublishServiceVersionUseCase,
    SearchServicesByCapabilityUseCase,
    AuthGuard,
    PermissionGuard,
    { provide: SERVICE_DEFINITION_REPOSITORY, useClass: PgServiceDefinitionRepository },
  ],
  exports: [CreateServiceDraftUseCase, PublishServiceVersionUseCase, SearchServicesByCapabilityUseCase],
})
export class ServicesModule {}
