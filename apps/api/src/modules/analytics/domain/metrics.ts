/** Analytics (S51). Values come from AUTHORITATIVE source tables - never
 * fabricated. Measured vs forecast is explicit; heavy queries are marked
 * read-only (route to a replica/reporting role in production). */
export interface MeasuredMetric {
  name: string;
  measuredValue: number;
  periodStart: string;
  periodEnd: string;
  source: "orders" | "assignments" | "ledger" | "disputes" | "reviews" | "workforce";
}

export class AnalyticsReadModel {
  private readonly metrics = new Map<string, MeasuredMetric>();
  record(m: MeasuredMetric): void {
    if (m.periodEnd < m.periodStart) throw new Error("invalid period");
    this.metrics.set(m.name + ":" + m.periodStart + ":" + m.periodEnd, m);
  }
  /** Returns MEASURED values only. There is no forecast path in this class -
   * deliberately: forecasts must be labeled and live elsewhere. */
  list(prefix?: string): MeasuredMetric[] {
    return [...this.metrics.values()]
      .filter(m => !prefix || m.name.startsWith(prefix))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  totals(): { requests: number; completed: number; cancelled: number; disputes: number } {
    const get = (n: string) => [...this.metrics.values()].filter(metric => metric.name === n).reduce((sum, metric) => sum + metric.measuredValue, 0);
    return {
      requests: get("orders.count"),
      completed: get("orders.completed"),
      cancelled: get("orders.cancelled"),
      disputes: get("disputes.count"),
    };
  }
}