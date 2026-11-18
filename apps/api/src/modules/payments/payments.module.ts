import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { ORDER_REPOSITORY, OrderRepositoryPort } from "../orders/domain/order.repository.port";
import { DatabaseService } from "../../infrastructure/database/database.service";
import { InMemoryOrderRepository } from "../orders/infrastructure/in-memory-order.repository";
import { PgOrderRepository } from "../orders/infrastructure/pg-order.repository";
import { WebhookProcessor } from "./domain/webhook";
import { ProcessWebhookUseCase } from "./application/process-webhook.use-case";
import { PaymentsController } from "./presentation/payments.controller";
import { PaymentIntentsController } from "./presentation/payment-intents.controller";
import { PayoutsController } from "./presentation/payouts.controller";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { SecurityModule } from "../security/security.module";
import { PgProcessedEventsRepository } from "./infrastructure/pg-processed-events.repository";
import { PgPaymentsRepository } from "./infrastructure/pg-payments.repository";
import { PAYMENTS_REPOSITORY } from "./domain/payments.repository.port";
import { FinanceModule } from "../finance/finance.module";
import { PostLedgerTransactionUseCase } from "../finance/application/post-ledger-transaction.use-case";

const useInMemory = process.env.NODE_ENV === "test";

@Module({
  imports: [FinanceModule, OrdersModule, AuthModule, SecurityModule],
  providers: [
    AuthGuard,
    { provide: WebhookProcessor, useFactory: () => new WebhookProcessor(process.env.PAYMENT_PROVIDER_SECRET ?? "") },
    { provide: PAYMENTS_REPOSITORY, useClass: PgPaymentsRepository },
    PgProcessedEventsRepository,
    {
      provide: ORDER_REPOSITORY,
      useFactory: (db: DatabaseService): OrderRepositoryPort =>
        useInMemory ? new InMemoryOrderRepository() : new PgOrderRepository(db),
      inject: [DatabaseService],
    },
    {
      provide: ProcessWebhookUseCase,
      useFactory: (processor: WebhookProcessor, postLedger: PostLedgerTransactionUseCase, events: PgProcessedEventsRepository) =>
        new ProcessWebhookUseCase(processor, postLedger, events),
      inject: [WebhookProcessor, PostLedgerTransactionUseCase, PgProcessedEventsRepository],
    },
  ],
  controllers: [PaymentsController, PaymentIntentsController, PayoutsController],
})
export class PaymentsModule {}