import { Module } from "@nestjs/common";
import { AiGateway } from "./ai-gateway";
import { LiveAiGateway } from "./ai-provider";

/** PHASE 7: adapter slot ships EMPTY (no provider configured). The owner
 * registers a real adapter (OpenAI-compatible/Anthropic/etc.) plus
 * AI_PROVIDER_API_KEY; until then status honestly reads
 * "LIVE AI PROVIDER NOT CONFIGURED - deterministic fallback only". */
@Module({
  providers: [
    { provide: AiGateway, useFactory: () => new AiGateway(process.env.AI_PROVIDER_API_KEY ?? "") },
    { provide: LiveAiGateway, useFactory: () => new LiveAiGateway(null) },
  ],
  exports: [AiGateway, LiveAiGateway],
})
export class AiModule {}