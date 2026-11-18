import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";

/** Real registry persistence (integration_configs from 0012). Only metadata
 * is stored - credentialConfigured is a boolean, secrets live in the host
 * secret manager and are NEVER written here. */
@Injectable()
export class PgIntegrationRepository {
  constructor(private readonly db: DatabaseService) {}

  async register(row: { kind: string; provider: string; environment: string; credential_configured: boolean; failure_behavior: string }): Promise<void> {
    await this.db.query(
      `INSERT INTO integration_configs (kind, provider, environment, credential_configured, failure_behavior, enabled)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (kind, provider) DO UPDATE
         SET environment = EXCLUDED.environment,
             credential_configured = EXCLUDED.credential_configured,
             failure_behavior = EXCLUDED.failure_behavior`,
      [row.kind, row.provider, row.environment, row.credential_configured, row.failure_behavior, row.credential_configured],
    );
  }

  async healthReport(): Promise<{ kind: string; provider: string; enabled: boolean; credential_configured: boolean; last_success_check: string | null; last_failure: string | null }[]> {
    return this.db.query(
      `SELECT kind, provider, enabled, credential_configured, last_success_check::text, last_failure
       FROM integration_configs ORDER BY kind, provider`,
    );
  }

  async recordSuccess(kind: string, provider: string): Promise<void> {
    await this.db.query(`UPDATE integration_configs SET last_success_check = now() WHERE kind = $1 AND provider = $2`, [kind, provider]);
  }

  async recordFailure(kind: string, provider: string, reason: string): Promise<void> {
    await this.db.query(`UPDATE integration_configs SET last_failure = $3 WHERE kind = $1 AND provider = $2`, [kind, provider, reason]);
  }
}