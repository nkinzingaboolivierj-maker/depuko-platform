import { AnalyticsReadModel } from "../domain/metrics";

describe("Analytics (S51)", () => {
  it("records and lists MEASURED values with sources", () => {
    const rm = new AnalyticsReadModel();
    rm.record({ name: "orders.count", measuredValue: 42, periodStart: "2026-11-01", periodEnd: "2026-11-30", source: "orders" });
    rm.record({ name: "ledger.revenue_cents", measuredValue: 500000, periodStart: "2026-11-01", periodEnd: "2026-11-30", source: "ledger" });
    expect(rm.list("orders.")).toHaveLength(1);
    expect(rm.totals().requests).toBe(42);
  });
  it("rejects invalid periods; no fabrication path exists", () => {
    const rm = new AnalyticsReadModel();
    expect(() => rm.record({ name: "x", measuredValue: 1, periodStart: "2026-11-30", periodEnd: "2026-11-01", source: "orders" })).toThrow(/period/);
  });
});