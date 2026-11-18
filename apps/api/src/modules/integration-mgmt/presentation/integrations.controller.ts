import { Body, Controller, Get, Post, UseGuards, Inject } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../../security/infrastructure/guards/permission.guard";
import { RequirePermission } from "../../security/infrastructure/guards/require-permission.decorator";
import { PgIntegrationRepository } from "../infrastructure/pg-integration.repository";

/** PHASE 6: real configuration + health surface. Registering metadata is
 * admin-gated (integrations:manage). Credential VALUES never transit this
 * API - only the boolean fact that they are configured. Missing credentials
 * disable ONLY this integration (S34) - enforced by enabled=credential flag. */
@Controller("integrations")
@UseGuards(AuthGuard, PermissionGuard)
export class IntegrationsController {
  constructor(@Inject(PgIntegrationRepository) private readonly integrations: PgIntegrationRepository) {}

  @Post()
  @RequirePermission("integrations:manage")
  async register(@Body() body: { kind: string; provider: string; environment: "local" | "staging" | "production"; credentialConfigured: boolean; failureBehavior?: "fail_closed" | "degrade_gracefully" }) {
    await this.integrations.register({
      kind: body.kind, provider: body.provider, environment: body.environment,
      credential_configured: body.credentialConfigured,
      failure_behavior: body.failureBehavior ?? "fail_closed",
    });
    return { registered: true, kind: body.kind, provider: body.provider, enabled: body.credentialConfigured };
  }

  @Get("health")
  @RequirePermission("integrations:manage")
  health() {
    return this.integrations.healthReport();
  }
}