import { Controller, Get } from "@nestjs/common";

/** Liveness/readiness for staging and CI smoke tests. Never exposes secrets. */
@Controller("health")
export class HealthController {
  @Get()
  health() {
    const aiConfigured = Boolean(process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY);
    return {
      status: "ok",
      service: "depuko-api",
      time: new Date().toISOString(),
      integrations: {
        payments: process.env.PAYMENT_PROVIDER_SECRET ? "configured" : "disabled (credentials missing)",
        ai: aiConfigured ? "configured" : "disabled (credentials missing)",
      },
    };
  }
}
