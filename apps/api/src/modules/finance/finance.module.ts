import { Module } from "@nestjs/common";
import { DatabaseService } from "../../infrastructure/database/database.service";
import { LEDGER_REPOSITORY, LedgerRepositoryPort } from "./domain/ledger.repository.port";
import { PgLedgerRepository } from "./infrastructure/pg-ledger.repository";
import { InMemoryLedgerRepository } from "./infrastructure/in-memory-ledger.repository";
import { PostLedgerTransactionUseCase } from "./application/post-ledger-transaction.use-case";
import { FinanceController } from "./presentation/finance.controller";

const useInMemory = process.env.NODE_ENV === "test";

@Module({
  providers: [
    {
      provide: LEDGER_REPOSITORY,
      useFactory: (db: DatabaseService): LedgerRepositoryPort =>
        useInMemory ? new InMemoryLedgerRepository() : new PgLedgerRepository(db),
      inject: [DatabaseService],
    },
    PostLedgerTransactionUseCase,
  ],
  controllers: [FinanceController],
  exports: [LEDGER_REPOSITORY, PostLedgerTransactionUseCase],
})
export class FinanceModule {}