import { Dispute } from "../domain/dispute";

describe("Disputes (S44)", () => {
  it("payout hold during investigation; refunds need amounts + human decision", () => {
    const d = new Dispute("d1", "order_1", "cust1", "w1", "quality");
    d.holdPayout();
    expect(d.payoutHeld).toBe(true);
    d.investigate();
    expect(() => d.resolve("partial_refund", "admin1")).toThrow(/amount/);
    d.resolve("partial_refund", "admin1", 5000);
    expect(d.resolution?.amountCents).toBe(5000);
  });
  it("same party dispute rejected; appeal works after resolution", () => {
    expect(() => new Dispute("d1", "order_1", "cust1", "cust1", "quality")).toThrow(/distinct/);
    const d = new Dispute("d1", "order_1", "cust1", "w1", "quality");
    d.resolve("dismissed", "admin1");
    d.appeal();
    expect(d.status).toBe("appealed");
  });
});