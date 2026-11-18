import { ServiceType } from '../value-objects/service-type.enum';

export type SimulationStatus = 'not_run' | 'passed' | 'failed';

/**
 * A ServiceVersion is immutable once published (§16). Existing orders keep
 * referencing the version they were created against — changing today's
 * configuration must never rewrite yesterday's accepted orders.
 */
export class ServiceVersion {
  private constructor(
    public readonly id: string,
    public readonly serviceDefinitionId: string,
    public readonly versionNumber: number,
    public readonly type: ServiceType,
    public readonly configuration: Record<string, unknown>,
    private _simulationStatus: SimulationStatus,
    private _publishedAt: Date | null,
  ) {}

  /** Construct a brand-new draft version (business entry point). */
  static draft(params: {
    id: string;
    serviceDefinitionId: string;
    versionNumber: number;
    type: ServiceType;
    configuration: Record<string, unknown>;
  }): ServiceVersion {
    return new ServiceVersion(
      params.id,
      params.serviceDefinitionId,
      params.versionNumber,
      params.type,
      params.configuration,
      'not_run',
      null,
    );
  }

  /**
   * Rehydrate a version from persistence. Bypasses draft business rules on
   * purpose — the repository is asserting this state was already valid when
   * it was persisted. Only infrastructure-layer code should call this.
   */
  static restore(params: {
    id: string;
    serviceDefinitionId: string;
    versionNumber: number;
    type: ServiceType;
    configuration: Record<string, unknown>;
    simulationStatus: SimulationStatus;
    publishedAt: Date | null;
  }): ServiceVersion {
    return new ServiceVersion(
      params.id,
      params.serviceDefinitionId,
      params.versionNumber,
      params.type,
      params.configuration,
      params.simulationStatus,
      params.publishedAt,
    );
  }

  get isPublished(): boolean {
    return this._publishedAt !== null;
  }

  get publishedAt(): Date | null {
    return this._publishedAt;
  }

  get simulationStatus(): SimulationStatus {
    return this._simulationStatus;
  }

  recordSimulation(status: SimulationStatus): void {
    if (this.isPublished) {
      throw new Error('Cannot re-simulate a published version — it is immutable (§16).');
    }
    this._simulationStatus = status;
  }

  publish(): void {
    if (this.isPublished) {
      throw new Error('Version is already published and immutable.');
    }
    if (this._simulationStatus !== 'passed') {
      // §15: a service with critical configuration errors must not be publishable.
      throw new Error('Cannot publish a version that has not passed simulation.');
    }
    this._publishedAt = new Date();
  }
}
