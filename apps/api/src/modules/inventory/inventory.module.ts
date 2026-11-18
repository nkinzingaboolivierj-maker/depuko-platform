import { Module } from "@nestjs/common";
import { PgStockRepository } from "./infrastructure/pg-stock.repository";
import { STOCK_REPOSITORY } from "./domain/stock.repository.port";
import { InventoryController } from "./presentation/inventory.controller";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";

@Module({
  imports: [AuthModule],
  providers: [{ provide: STOCK_REPOSITORY, useClass: PgStockRepository }, AuthGuard],
  controllers: [InventoryController],
})
export class InventoryModule {}