import { Controller, Get } from "@nestjs/common";

/** Liveness/readiness for staging and CI smoke tests. No secrets, no
 * internals - just process + integration-boundary status. */
@Controller("health")
export class HealthController {
  @Get()
  health() {
    return {
      status: "ok",
      service: "depuko-api",
      time: new Date().toISOString(),
      integrations: {
        payments: process.env.PAYMENT_PROVIDER_SECRET ? "configured" : "disabled (credentials missing)",
        ai: process.env.AI_PROVIDER_API_KEY ? "configured" : "disabled (credentials missing)",
      },
    };
  }
}