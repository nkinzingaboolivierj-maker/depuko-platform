import { ServiceVersion } from './service-version.entity';
import { ServiceType } from '../value-objects/service-type.enum';

/**
 * A ServiceDefinition is the stable identity a service keeps across versions
 * (§12, §16). Publishing never happens on the definition directly — only on
 * a specific ServiceVersion.
 */
export class ServiceDefinition {
  private readonly versions: ServiceVersion[];

  private constructor(
    public readonly id: string,
    public readonly domain: string,
    public readonly category: string,
    public readonly capabilities: string[],
    versions: ServiceVersion[],
  ) {
    this.versions = versions;
  }

  /** Construct a brand-new definition with no versions yet. */
  static create(params: {
    id: string;
    domain: string;
    category: string;
    capabilities: string[];
  }): ServiceDefinition {
    return new ServiceDefinition(params.id, params.domain, params.category, params.capabilities, []);
  }

  /** Rehydrate from persistence, including already-loaded versions. */
  static restore(params: {
    id: string;
    domain: string;
    category: string;
    capabilities: string[];
    versions: ServiceVersion[];
  }): ServiceDefinition {
    return new ServiceDefinition(params.id, params.domain, params.category, params.capabilities, params.versions);
  }

  addDraftVersion(type: ServiceType, configuration: Record<string, unknown>): ServiceVersion {
    const version = ServiceVersion.draft({
      id: `${this.id}_v${this.versions.length + 1}`,
      serviceDefinitionId: this.id,
      versionNumber: this.versions.length + 1,
      type,
      configuration,
    });
    this.versions.push(version);
    return version;
  }

  get latestPublishedVersion(): ServiceVersion | undefined {
    return [...this.versions].reverse().find((v) => v.isPublished);
  }

  get allVersions(): readonly ServiceVersion[] {
    return this.versions;
  }
}
