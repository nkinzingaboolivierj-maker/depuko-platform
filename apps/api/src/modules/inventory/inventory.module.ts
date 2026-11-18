import { Module } from "@nestjs/common";
import { PgStockRepository } from "./infrastructure/pg-stock.repository";
import { STOCK_REPOSITORY } from "./domain/stock.repository.port";
import { InventoryController } from "./presentation/inventory.controller";

@Module({
  providers: [{ provide: STOCK_REPOSITORY, useClass: PgStockRepository }],
  controllers: [InventoryController],
})
export class InventoryModule {}