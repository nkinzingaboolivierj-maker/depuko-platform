import { Module } from "@nestjs/common";
import { AiGateway } from "./ai-gateway";
import { LiveAiGateway } from "./ai-provider";
import { AiController } from "./ai.controller";
import { OpenAiAdapter } from "./infrastructure/openai.adapter";

@Module({
  controllers: [AiController],
  providers: [
    OpenAiAdapter,
    { provide: AiGateway, useFactory: () => new AiGateway(process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY || "") },
    {
      provide: LiveAiGateway,
      useFactory: (adapter: OpenAiAdapter) => new LiveAiGateway(
        (process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY) ? adapter : null,
      ),
      inject: [OpenAiAdapter],
    },
  ],
  exports: [AiGateway, LiveAiGateway, OpenAiAdapter],
})
export class AiModule {}
