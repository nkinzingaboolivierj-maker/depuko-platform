import { Entry, LedgerAccount } from "./ledger";

export const LEDGER_REPOSITORY = "LEDGER_REPOSITORY";

export interface BalanceCheckRow { transaction_id: string; net_cents: string | number }

export interface LedgerRepositoryPort {
  /** true when posted; false on idempotent replay of the same txId (S55). */
  post(params: { txId: string; description: string; reference?: string; entries: Entry[] }): Promise<boolean>;
  balances(): Promise<Record<string, number>>;
  accounts(): Promise<LedgerAccount[]>;
  /** Rows from v_ledger_balance_check - non-zero net is a BUG. */
  balanceCheck(): Promise<BalanceCheckRow[]>;
}