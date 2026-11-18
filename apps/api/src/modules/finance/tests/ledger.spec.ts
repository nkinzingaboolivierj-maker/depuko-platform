import { InMemoryLedgerRepository } from "../infrastructure/in-memory-ledger.repository";
import { PostLedgerTransactionUseCase } from "../application/post-ledger-transaction.use-case";
import { assertBalanced } from "../domain/ledger";

function repo() { return new InMemoryLedgerRepository(); }
function settled(l: InMemoryLedgerRepository, txId: string, cents: number) {
  return l.post({ txId, description: "payment settled", entries: [
    { accountId: "acc_cash", direction: "debit", amountCents: cents },
    { accountId: "acc_payable", direction: "credit", amountCents: cents },
  ]});
}

describe("Ledger (S39)", () => {
  it("posts balanced settlement then clears on payout", async () => {
    const l = repo();
    expect(await settled(l, "tx1", 25000)).toBe(true);
    expect(await l.post({ txId: "tx2", description: "payout", entries: [
      { accountId: "acc_payable", direction: "debit", amountCents: 25000 },
      { accountId: "acc_cash", direction: "credit", amountCents: 25000 },
    ]})).toBe(true);
    const b = await l.balances();
    expect(b["acc_cash"]).toBe(0);
    expect(b["acc_payable"]).toBe(0);
  });
  it("revenue increases on CREDIT (real accounting signs)", async () => {
    const l = repo();
    await l.post({ txId: "tx", description: "fee", entries: [
      { accountId: "acc_cash", direction: "debit", amountCents: 1000 },
      { accountId: "acc_revenue", direction: "credit", amountCents: 1000 },
    ]});
    const b = await l.balances();
    expect(b["acc_cash"]).toBe(1000);
    expect(b["acc_revenue"]).toBe(1000);
  });
  it("rejects unbalanced by construction (domain + repo)", async () => {
    expect(() => assertBalanced([
      { accountId: "a", direction: "debit", amountCents: 100 },
      { accountId: "b", direction: "credit", amountCents: 99 },
    ])).toThrow(/UNBALANCED/);
    const l = repo();
    await expect(l.post({ txId: "tx", description: "bad", entries: [
      { accountId: "acc_cash", direction: "debit", amountCents: 100 },
      { accountId: "acc_payable", direction: "credit", amountCents: 99 },
    ]})).rejects.toThrow(/UNBALANCED/);
  });
  it("is idempotent on replay (S55)", async () => {
    const l = repo();
    await settled(l, "tx", 5);
    expect(await settled(l, "tx", 5)).toBe(false);
    expect((await l.balances())["acc_cash"]).toBe(5);
  });
  it("balance-check reports healthy books and the use case forwards", async () => {
    const l = repo();
    await settled(l, "tx1", 10);
    const rows = await l.balanceCheck();
    expect(rows.every(r => Number(r.net_cents) === 0)).toBe(true);
    const uc = new PostLedgerTransactionUseCase(l);
    const r = await uc.execute({ txId: "u1", description: "x", entries: [
      { accountId: "acc_cash", direction: "debit", amountCents: 1 },
      { accountId: "acc_revenue", direction: "credit", amountCents: 1 },
    ]});
    expect(r.posted).toBe(true);
  });
});