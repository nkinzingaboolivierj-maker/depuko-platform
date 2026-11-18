import { LedgerAccount, Entry, assertBalanced, signedDelta, AccountType } from "../domain/ledger";
import { LedgerRepositoryPort, BalanceCheckRow } from "../domain/ledger.repository.port";

/** TEST implementation only. Mirrors the pg contract exactly. */
export class InMemoryLedgerRepository implements LedgerRepositoryPort {
  private readonly types = new Map<string, AccountType>([
    ["acc_cash", "asset"], ["acc_payable", "liability"], ["acc_revenue", "revenue"],
  ]);
  private readonly entries = new Map<string, Entry[]>();

  async post(params: { txId: string; description: string; reference?: string; entries: Entry[] }): Promise<boolean> {
    assertBalanced(params.entries);
    for (const e of params.entries) if (!this.types.has(e.accountId)) throw new Error("unknown account: " + e.accountId);
    if (this.entries.has(params.txId)) return false;
    this.entries.set(params.txId, params.entries);
    return true;
  }
  async balances(): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const [id, type] of this.types) {
      out[id] = [...this.entries.values()].flat()
        .filter(e => e.accountId === id)
        .reduce((sum, e) => sum + signedDelta(type, e.direction, e.amountCents), 0);
    }
    return out;
  }
  async accounts(): Promise<LedgerAccount[]> {
    return [...this.types.entries()].map(([id, type]) => new LedgerAccount(id, type));
  }
  async balanceCheck(): Promise<BalanceCheckRow[]> {
    return [...this.entries.entries()].map(([txId, entries]) => ({
      transaction_id: txId,
      net_cents: entries.filter(e => e.direction === "debit").reduce((a, e) => a + e.amountCents, 0)
                - entries.filter(e => e.direction === "credit").reduce((a, e) => a + e.amountCents, 0),
    }));
  }
}