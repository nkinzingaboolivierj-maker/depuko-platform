import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../../security/infrastructure/guards/permission.guard";
import { RequirePermission } from "../../security/infrastructure/guards/require-permission.decorator";
import { PgAnalyticsRepository } from "../infrastructure/pg-analytics.repository";

/** Admin analytics: MEASURED aggregates only. No forecasts, no fabricated
 * metrics. Requires the analytics:read permission (added to the policy). */
@Controller("analytics")
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission("analytics:read")
export class AnalyticsController {
  constructor(@Inject(PgAnalyticsRepository) private readonly analytics: PgAnalyticsRepository) {}

  @Get("orders")
  orders() { return this.analytics.ordersByStatus(); }

  @Get("revenue")
  revenue() { return this.analytics.revenueByMonth(); }

  @Get("disputes")
  async disputes() { return this.analytics.disputeCount(); }

  @Get("assignments")
  assignments() { return this.analytics.assignmentCompletion(); }
}