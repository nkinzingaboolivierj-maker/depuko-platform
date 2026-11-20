import { WebhookProcessor } from "../domain/webhook";
import { ProcessWebhookUseCase } from "../application/process-webhook.use-case";
import { InMemoryLedgerRepository } from "../../finance/infrastructure/in-memory-ledger.repository";
import { PostLedgerTransactionUseCase } from "../../finance/application/post-ledger-transaction.use-case";
import { PaymentIntent, Refund } from "../domain/payment-state";

function harness(secret = "test-secret") {
  const ledger = new InMemoryLedgerRepository();
  const uc = new ProcessWebhookUseCase(new WebhookProcessor(secret), new PostLedgerTransactionUseCase(ledger));
  return { ledger, uc };
}

describe("Payments (S56 + S39)", () => {
  it("accepts a correctly signed event and posts the ledger", async () => {
    const { ledger, uc } = harness();
    const ev = { eventId: "e1", orderId: "o1", outcome: "settled" as const, amountCents: 25000 };
    const r = await uc.execute({ event: ev, signature: new WebhookProcessor("test-secret").sign(ev) });
    expect(r.status).toBe("settled");
    expect((await ledger.balances())["acc_cash"]).toBe(25000);
  });
  it("rejects forged signatures BEFORE any ledger change", async () => {
    const { ledger, uc } = harness();
    const ev = { eventId: "e2", orderId: "o1", outcome: "settled" as const, amountCents: 100 };
    await expect(uc.execute({ event: ev, signature: "deadbeef" })).rejects.toThrow(/INVALID SIGNATURE/);
    expect((await ledger.balances())["acc_cash"]).toBe(0);
  });
  it("replayed event posts the ledger EXACTLY once (PK-level dedup)", async () => {
    const { ledger } = harness();
    const seen = new Set<string>();
    const recorder = { recordOnce: async (id: string) => (seen.has(id) ? false : (seen.add(id), true)) };
    const uc = new ProcessWebhookUseCase(new WebhookProcessor("s"), new PostLedgerTransactionUseCase(ledger), recorder);
    const ev = { eventId: "e3", orderId: "o1", outcome: "settled" as const, amountCents: 500 };
    const w = new WebhookProcessor("s");
    await uc.execute({ event: ev, signature: w.sign(ev) });
    const second = await uc.execute({ event: ev, signature: w.sign(ev) });
    expect(second.status).toBe("duplicate");
    expect((await ledger.balances())["acc_cash"]).toBe(500);
  });
  it("routes production events through atomic persistence, not a separate dedup write", async () => {
    const ledger = new InMemoryLedgerRepository();
    const eventCalls: string[] = [];
    const settlementCalls: string[] = [];
    const events = { recordOnce: async (id: string) => { eventCalls.push(id); return true; } };
    const settlement = { settleWebhook: async (event: { eventId: string }) => { settlementCalls.push(event.eventId); return { status: "settled", txId: "ledger_atomic" }; } };
    const uc = new ProcessWebhookUseCase(new WebhookProcessor("atomic-secret"), new PostLedgerTransactionUseCase(ledger), events, settlement);
    const ev = { eventId: "atomic-1", orderId: "order-1", outcome: "settled" as const, amountCents: 1234 };
    const result = await uc.execute({ event: ev, signature: new WebhookProcessor("atomic-secret").sign(ev) });
    expect(result).toEqual({ status: "settled", txId: "ledger_atomic" });
    expect(settlementCalls).toEqual(["atomic-1"]);
    expect(eventCalls).toEqual([]);
  });
  it("missing provider secret disables the rail without blocking boot", () => {
    const off = new WebhookProcessor("");
    expect(off.disabled).toBe(true);
    expect(off.disabledReason).toMatch(/not configured/);
  });
  it("payment + refund state machines reject illegal moves", () => {
    const pi = new PaymentIntent("pi1", "o1", 1000, "RWF", "test");
    expect(() => pi.settle()).toThrow(/illegal/);
    pi.transitionTo("pending");
    pi.transitionTo("authorized");
    pi.settle();
    expect(pi.status).toBe("settled");
  });
  it("refunds follow requested -> approved -> processed", () => {
    const rf = new Refund("rf1", "pi1", 500);
    expect(() => rf.processed()).toThrow(/illegal/);
    rf.approve(); rf.processed();
    expect(rf.status).toBe("processed");
  });
});