import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AiProviderAdapter } from "../ai-provider";

/** Server-side OpenAI Responses API adapter. The API key is read only from
 * Railway environment variables and is never returned to clients. */
@Injectable()
export class OpenAiAdapter implements AiProviderAdapter {
  readonly provider = "openai";
  readonly model = process.env.OPENAI_MODEL || "gpt-5.5";

  async complete(params: {
    system: string;
    user: string;
    maxOutputTokens: number;
    timeoutMs: number;
  }): Promise<{ text: string; costMicroUsd: number }> {
    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException("AI provider is not configured");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        instructions: params.system,
        input: params.user,
        max_output_tokens: params.maxOutputTokens,
        store: false,
      }),
      signal: AbortSignal.timeout(params.timeoutMs),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      // Do not expose provider response details or credentials to callers.
      throw new Error(`OpenAI request failed with status ${response.status}: ${detail.slice(0, 300)}`);
    }

    const data = await response.json() as {
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    const text = data.output_text ?? data.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text" && typeof item.text === "string")
      .map((item) => item.text)
      .join("\n") ?? "";

    if (!text.trim()) throw new Error("OpenAI returned an empty response");
    // Exact billing is intentionally not guessed; usage metering is a separate task.
    return { text: text.trim(), costMicroUsd: 0 };
  }
}
