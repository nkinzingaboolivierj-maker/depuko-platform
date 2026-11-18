import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../infrastructure/database/database.service';
import { ServiceDefinition } from '../domain/entities/service-definition.entity';
import { ServiceVersion, SimulationStatus } from '../domain/entities/service-version.entity';
import { ServiceType } from '../domain/value-objects/service-type.enum';
import { ServiceDefinitionRepositoryPort } from '../domain/service-definition.repository.port';

interface DefinitionRow {
  id: string;
  domain: string;
  category: string;
  capabilities: string[];
}

interface VersionRow {
  id: string;
  service_definition_id: string;
  version_number: number;
  type: ServiceType;
  configuration: Record<string, unknown>;
  simulation_status: SimulationStatus;
  published_at: Date | null;
}

function versionToDomain(row: VersionRow): ServiceVersion {
  return ServiceVersion.restore({
    id: row.id,
    serviceDefinitionId: row.service_definition_id,
    versionNumber: row.version_number,
    type: row.type,
    configuration: row.configuration,
    simulationStatus: row.simulation_status,
    publishedAt: row.published_at,
  });
}

/**
 * Real persistence for the Universal Service Engine's core entities, backed
 * by service_definitions / service_versions (see
 * database/migrations/0001_init.sql). §16 immutability is enforced in the
 * domain layer (ServiceVersion.publish()) — this repository just persists
 * whatever state the domain object already validated.
 */
@Injectable()
export class PgServiceDefinitionRepository implements ServiceDefinitionRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async save(definition: ServiceDefinition): Promise<void> {
    await this.db.withTransaction(async (query) => {
      await query(
        `INSERT INTO service_definitions (id, domain, category, capabilities)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET capabilities = EXCLUDED.capabilities`,
        [definition.id, definition.domain, definition.category, definition.capabilities],
      );

      for (const version of definition.allVersions) {
        await query(
          `INSERT INTO service_versions
             (id, service_definition_id, version_number, type, configuration, simulation_status, published_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             simulation_status = EXCLUDED.simulation_status,
             published_at = EXCLUDED.published_at`,
          [
            version.id,
            version.serviceDefinitionId,
            version.versionNumber,
            version.type,
            JSON.stringify(version.configuration),
            version.simulationStatus,
            version.publishedAt,
          ],
        );
      }
    });
  }

  async findById(id: string): Promise<ServiceDefinition | null> {
    const defRows = await this.db.query<DefinitionRow>(
      'SELECT * FROM service_definitions WHERE id = $1',
      [id],
    );
    if (!defRows[0]) return null;

    const versionRows = await this.db.query<VersionRow>(
      'SELECT * FROM service_versions WHERE service_definition_id = $1 ORDER BY version_number ASC',
      [id],
    );

    return ServiceDefinition.restore({
      id: defRows[0].id,
      domain: defRows[0].domain,
      category: defRows[0].category,
      capabilities: defRows[0].capabilities,
      versions: versionRows.map(versionToDomain),
    });
  }

  async findByCapabilities(capabilities: string[]): Promise<ServiceDefinition[]> {
    // §69 golden test: discovery by capability, not by service name.
    const defRows = await this.db.query<DefinitionRow>(
      'SELECT * FROM service_definitions WHERE capabilities && $1',
      [capabilities],
    );

    const definitions: ServiceDefinition[] = [];
    for (const row of defRows) {
      const versionRows = await this.db.query<VersionRow>(
        'SELECT * FROM service_versions WHERE service_definition_id = $1 ORDER BY version_number ASC',
        [row.id],
      );
      definitions.push(
        ServiceDefinition.restore({
          id: row.id,
          domain: row.domain,
          category: row.category,
          capabilities: row.capabilities,
          versions: versionRows.map(versionToDomain),
        }),
      );
    }
    return definitions;
  }
}
