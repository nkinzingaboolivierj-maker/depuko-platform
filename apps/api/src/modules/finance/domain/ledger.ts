/** Double-entry ledger domain (S39). Unbalanced posts rejected BY CONSTRUCTION.
 * Amounts are exact integer minor units - never floating point. */
export type AccountType = "asset" | "liability" | "revenue" | "expense" | "equity";
export type Direction = "debit" | "credit";

export class LedgerAccount {
  constructor(public readonly id: string, public readonly type: AccountType) {}
}

export interface Entry {
  accountId: string;
  direction: Direction;
  amountCents: number;
}

export function assertBalanced(entries: Entry[]): void {
  if (entries.length < 2) throw new Error("transaction needs at least two lines");
  const debit = entries.filter(e => e.direction === "debit").reduce((a, e) => a + e.amountCents, 0);
  const credit = entries.filter(e => e.direction === "credit").reduce((a, e) => a + e.amountCents, 0);
  if (debit !== credit || debit === 0) throw new Error("UNBALANCED TRANSACTION REJECTED");
}

export function signedDelta(type: AccountType, direction: Direction, amountCents: number): number {
  const increases: Direction = type === "asset" || type === "expense" ? "debit" : "credit";
  return (direction === increases ? 1 : -1) * amountCents;
}

/** Pure in-process ledger for unit tests and NODE_ENV=test wiring. */
export class Ledger {
  private readonly accounts = new Map<string, LedgerAccount>();
  private readonly posted = new Set<string>();

  addAccount(acc: LedgerAccount): this {
    if (this.accounts.has(acc.id)) throw new Error("account exists: " + acc.id);
    this.accounts.set(acc.id, acc);
    return this;
  }
  hasAccount(id: string): boolean { return this.accounts.has(id); }
  post(txId: string, entries: Entry[]): boolean {
    if (this.posted.has(txId)) return false;
    assertBalanced(entries);
    for (const e of entries) if (!this.accounts.has(e.accountId)) throw new Error("unknown account: " + e.accountId);
    this.posted.add(txId);
    return true;
  }
  hasPosted(txId: string): boolean { return this.posted.has(txId); }
}