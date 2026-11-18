import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { assertBalanced, signedDelta, LedgerAccount, AccountType, Entry } from "../domain/ledger";
import { LedgerRepositoryPort, BalanceCheckRow } from "../domain/ledger.repository.port";

interface AccountRow { id: string; account_type: AccountType }

/** Transactional double-entry posting (S39/S48): tx header + all lines in ONE
 * database transaction; the DB re-verifies balance before COMMIT. Entries are
 * append-only; corrections go through authorized reversing entries. */
@Injectable()
export class PgLedgerRepository implements LedgerRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async post(params: { txId: string; description: string; reference?: string; entries: Entry[] }): Promise<boolean> {
    assertBalanced(params.entries);
    const types = new Map<string, AccountType>(
      (await this.db.query<AccountRow>("SELECT id, account_type FROM ledger_accounts")).map(r => [r.id, r.account_type] as const),
    );
    for (const e of params.entries) if (!types.has(e.accountId)) throw new Error("unknown account: " + e.accountId);
    return this.db.withTransaction(async q => {
      const existing = await q<{ id: string }>("SELECT id FROM ledger_transactions WHERE id = $1", [params.txId]);
      if (existing.length > 0) return false;
      await q("INSERT INTO ledger_transactions (id, description, reference) VALUES ($1,$2,$3)",
        [params.txId, params.description, params.reference ?? null]);
      for (const e of params.entries) {
        await q(`INSERT INTO ledger_entries (id, transaction_id, account_id, direction, amount_cents) VALUES ($1,$2,$3,$4,$5)`,
          [randomUUID(), params.txId, e.accountId, e.direction, e.amountCents]);
      }
      const check = await q<{ net: string | number }>(
        `SELECT COALESCE(SUM(CASE WHEN direction='debit' THEN amount_cents ELSE -amount_cents END),0) AS net
         FROM ledger_entries WHERE transaction_id = $1`, [params.txId]);
      if (Number(check[0]?.net ?? 1) !== 0) throw new Error("DB BALANCE CHECK FAILED - transaction rolled back");
      return true;
    });
  }

  async balances(): Promise<Record<string, number>> {
    const types = new Map((await this.db.query<AccountRow>("SELECT id, account_type FROM ledger_accounts")).map(r => [r.id, r.account_type] as const));
    const rows = await this.db.query<{ account_id: string; direction: "debit" | "credit"; total: string }>(
      `SELECT account_id, direction, SUM(amount_cents)::text AS total FROM ledger_entries GROUP BY account_id, direction`);
    const out: Record<string, number> = {};
    for (const id of types.keys()) out[id] = 0;
    for (const row of rows) {
      const type = types.get(row.account_id);
      if (!type) continue;
      out[row.account_id] = (out[row.account_id] ?? 0) + signedDelta(type, row.direction, Number(row.total));
    }
    return out;
  }

  async accounts(): Promise<LedgerAccount[]> {
    const rows = await this.db.query<AccountRow>("SELECT id, account_type FROM ledger_accounts ORDER BY id");
    return rows.map(r => new LedgerAccount(r.id, r.account_type));
  }

  async balanceCheck(): Promise<BalanceCheckRow[]> {
    return this.db.query<BalanceCheckRow>("SELECT transaction_id, net_cents FROM v_ledger_balance_check");
  }
}