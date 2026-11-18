/** Integration registry (S34). Missing credentials disable ONLY the affected
 * integration - never unrelated system functions. Health + last-check
 * tracking is first-class; failure behavior is explicit per integration. */
export type IntegrationKind =
  | "payment" | "payout" | "ai" | "email" | "sms" | "push"
  | "object_storage" | "maps" | "identity_verification" | "video_voice"
  | "file_scanning" | "monitoring";

export interface IntegrationConfig {
  kind: IntegrationKind;
  provider: string;
  environment: "local" | "staging" | "production";
  credentialConfigured: boolean;
  enabled: boolean;
  failureBehavior: "fail_closed" | "degrade_gracefully";
  supportedRegions?: string[];
}

export class IntegrationRegistry {
  private readonly entries = new Map<string, IntegrationConfig & { lastSuccessCheck?: number; lastFailure?: string }>();

  register(cfg: IntegrationConfig): void {
    if (!cfg.credentialConfigured) cfg.enabled = false; // never enable without credentials
    this.entries.set(cfg.kind + ":" + cfg.provider, { ...cfg });
  }
  get(kind: IntegrationKind, provider: string): (IntegrationConfig & { lastSuccessCheck?: number; lastFailure?: string }) | undefined {
    return this.entries.get(kind + ":" + provider);
  }
  /** The gate every integration call must pass first. */
  usable(kind: IntegrationKind, provider: string): { ok: boolean; reason?: string } {
    const e = this.entries.get(kind + ":" + provider);
    if (!e) return { ok: false, reason: "integration not registered" };
    if (!e.credentialConfigured) return { ok: false, reason: "credentials missing - integration disabled (others unaffected)" };
    if (!e.enabled) return { ok: false, reason: "integration disabled" };
    return { ok: true };
  }
  recordSuccess(kind: IntegrationKind, provider: string): void {
    const e = this.entries.get(kind + ":" + provider);
    if (e) e.lastSuccessCheck = Date.now();
  }
  recordFailure(kind: IntegrationKind, provider: string, reason: string): void {
    const e = this.entries.get(kind + ":" + provider);
    if (e) e.lastFailure = reason;
  }
  healthReport(): { kind: IntegrationKind; provider: string; enabled: boolean; healthy: boolean; lastFailure?: string }[] {
    return [...this.entries.values()].map(e => ({
      kind: e.kind, provider: e.provider, enabled: e.enabled,
      healthy: e.credentialConfigured && e.enabled && !e.lastFailure,
      lastFailure: e.lastFailure,
    }));
  }
}