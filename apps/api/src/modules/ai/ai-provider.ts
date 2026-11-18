/** PHASE 7: provider-agnostic AI gateway with a REAL adapter interface.
 * Live AI stays unavailable until credentials are configured - the gateway
 * reports its status honestly and falls back to the deterministic resolver.
 * The gateway can NEVER: post ledger entries, authorize payments/refunds/
 * payouts, approve businesses, publish services, or alter contracts. */
import { AiGateway } from "./ai-gateway";

export interface AiProviderAdapter {
  readonly provider: string;
  readonly model: string;
  complete(params: {
    system: string;
    user: string;
    maxOutputTokens: number;
    timeoutMs: number;
  }): Promise<{ text: string; costMicroUsd: number }>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** Server-side executor the AI may REQUEST; results are returned to the
   * model only after passing this schema check. The AI can never execute a
   * tool on its own authority - the server runs tools after validation. */
  inputSchema: Record<string, "string" | "number" | "boolean">;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

export class LiveAiGateway {
  readonly providerConfigured: boolean;
  private readonly window: number[] = [];
  public readonly callLog: { at: number; ok: boolean; costMicroUsd: number }[] = [];
  public totalCostMicroUsd = 0;

  constructor(
    private readonly adapter: AiProviderAdapter | null,
    private readonly rateLimitPerMinute = 30,
    private readonly fallback: AiGateway = new AiGateway(""),
  ) {
    this.providerConfigured = adapter !== null;
  }

  get status(): string {
    return this.providerConfigured
      ? `live via ${this.adapter!.provider}/${this.adapter!.model}`
      : "LIVE AI PROVIDER NOT CONFIGURED - deterministic fallback only";
  }

  private rateLimited(now = Date.now()): boolean {
    this.window.push(now);
    while (this.window.length > 0 && now - this.window[0] > 60_000) this.window.shift();
    return this.window.length > this.rateLimitPerMinute;
  }

  async intent(text: string, vocabulary: Record<string, string[]>): Promise<{ source: "live" | "fallback"; capability: string | null; confidence: number }> {
    const sanitized = AiGateway.sanitizePromptInjection(text);
    const local = this.fallback.resolveIntent(sanitized, vocabulary);
    if (!this.providerConfigured || this.rateLimited()) {
      return { source: "fallback", capability: local?.capability ?? null, confidence: local?.confidence ?? 0 };
    }
    try {
      const r = await this.adapter!.complete({
        system: "You are DEPUKO service intent classifier. Classify ONLY. Never execute actions.",
        user: sanitized,
        maxOutputTokens: 64,
        timeoutMs: 5000,
      });
      this.callLog.push({ at: Date.now(), ok: true, costMicroUsd: r.costMicroUsd });
      this.totalCostMicroUsd += r.costMicroUsd;
      const cap = r.text.trim();
      const valid = Object.keys(vocabulary).includes(cap) ? cap : null;
      return { source: "live", capability: valid ?? local?.capability ?? null, confidence: valid ? 0.95 : (local?.confidence ?? 0) };
    } catch {
      this.callLog.push({ at: Date.now(), ok: false, costMicroUsd: 0 });
      return { source: "fallback", capability: local?.capability ?? null, confidence: local?.confidence ?? 0 };
    }
  }
}