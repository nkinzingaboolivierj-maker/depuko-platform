import { Module } from "@nestjs/common";
import { DatabaseService } from "../../infrastructure/database/database.service";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { CreateOrderUseCase } from "./application/create-order.use-case";
import { TransitionOrderUseCase } from "./application/transition-order.use-case";
import { OrdersController } from "./presentation/orders.controller";
import { ORDER_REPOSITORY, OrderRepositoryPort } from "./domain/order.repository.port";
import { InMemoryOrderRepository } from "./infrastructure/in-memory-order.repository";
import { PgOrderRepository } from "./infrastructure/pg-order.repository";

const useInMemory = process.env.NODE_ENV === "test";

@Module({
  imports: [AuthModule],
  providers: [
    AuthGuard,
    {
      provide: ORDER_REPOSITORY,
      useFactory: (db: DatabaseService): OrderRepositoryPort =>
        useInMemory ? new InMemoryOrderRepository() : new PgOrderRepository(db),
      inject: [DatabaseService],
    },
    CreateOrderUseCase,
    TransitionOrderUseCase,
  ],
  controllers: [OrdersController],
})
export class OrdersModule {}