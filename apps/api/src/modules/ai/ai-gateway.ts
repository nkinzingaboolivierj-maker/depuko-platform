/** Provider-agnostic AI gateway boundary (S43-45). REAL but deliberately
 * narrow: deterministic keyword intent resolution when no provider is
 * configured; provider slot exists but is NOT CONFIGURED until the owner
 * registers credentials. The gateway NEVER posts ledger entries, NEVER
 * verifies identities, NEVER publishes services. All input is untrusted data. */
export interface AiIntent { capability: string; confidence: number }

export class AiGateway {
  readonly providerConfigured: boolean;

  constructor(apiKey: string) {
    this.providerConfigured = Boolean(apiKey);
  }

  get status(): string {
    return this.providerConfigured ? "live" : "NOT CONFIGURED - deterministic fallback only";
  }

  /** Deterministic, explainable intent resolution - honest fallback, not a
   * fabricated LLM. */
  resolveIntent(text: string, vocabulary: Record<string, string[]>): AiIntent | null {
    const normalized = text.toLowerCase();
    for (const [capability, keywords] of Object.entries(vocabulary)) {
      const hits = keywords.filter(k => normalized.includes(k.toLowerCase()));
      if (hits.length > 0) {
        return { capability, confidence: Math.min(0.9, 0.5 + hits.length * 0.1) };
      }
    }
    return null;
  }

  /** Prompt-injection defense (S45): user text NEVER becomes an instruction.
   * Classification stays text-only; instruction-like patterns are neutralized. */
  static sanitizePromptInjection(text: string): string {
    return text
      .replace(/ignore (all|previous) instructions/gi, "[neutralized]")
      .replace(/you are now/gi, "[neutralized]")
      .replace(/disregard .*/gi, "[neutralized]");
  }
}