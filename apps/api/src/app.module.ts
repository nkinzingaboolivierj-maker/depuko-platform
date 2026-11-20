import { Module } from "@nestjs/common";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ServicesModule } from "./modules/services/services.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { BusinessOnboardingModule } from "./modules/business-onboarding/business-onboarding.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { WorkforceModule } from "./modules/workforce/workforce.module";
import { CommunicationModule } from "./modules/communication/communication.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SchedulingModule } from "./modules/scheduling/scheduling.module";
import { DispatchModule } from "./modules/dispatch/dispatch.module";
import { ContractsModule } from "./modules/contracts/contracts.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { AiModule } from "./modules/ai/ai.module";
import { HealthModule } from "./modules/health/health.module";
import { LogisticsModule } from "./modules/logistics/logistics.module";
import { PayrollModule } from "./modules/payroll/payroll.module";
import { FilesModule } from "./modules/files/files.module";
import { SupportModule } from "./modules/support/support.module";
import { TrustModule } from "./modules/trust/trust.module";
import { DisputesModule } from "./modules/disputes/disputes.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { IntegrationMgmtModule } from "./modules/integration-mgmt/integration-mgmt.module";
import { CapabilitiesModule } from "./modules/capabilities/capabilities.module";
import { OpportunitiesModule } from "./modules/opportunities/opportunities.module";
import { QuotesModule } from "./modules/quotes/quotes.module";
import { SecurityModule } from "./modules/security/security.module";
import { BillingModule } from "./modules/billing/billing.module";

@Module({
  imports: [
    DatabaseModule, AuditModule, AuthModule, SecurityModule, ServicesModule, QuotesModule,
    OrdersModule, FinanceModule, PaymentsModule, ProjectsModule,
    OrganizationsModule, BusinessOnboardingModule, BillingModule,
    CustomersModule, WorkforceModule, CommunicationModule, NotificationsModule,
    SchedulingModule, DispatchModule, ContractsModule, InventoryModule, AssetsModule,
    AiModule, HealthModule, LogisticsModule, PayrollModule, FilesModule, SupportModule,
    TrustModule, DisputesModule, ReviewsModule, AnalyticsModule, IntegrationMgmtModule,
    CapabilitiesModule, OpportunitiesModule,
  ],
})
export class AppModule {}