/**
 * PHASE 11 additions: financial-integrity + audit + concurrency at the
 * domain level. HTTP variants run in the E2E suite above.
 */
import { Ledger, LedgerAccount, assertBalanced } from "../modules/finance/domain/ledger";
import { SafePayrollRun, PayrollRulesRegistry } from "../modules/payroll/domain/payroll-rules.registry";
import { SecureFile, FileLifecycleService } from "../modules/files/domain/file-lifecycle";

describe("Financial integrity (Phase 11)", () => {
  it("duplicate financial processing is blocked by idempotent txIds", () => {
    const l = new Ledger().addAccount(new LedgerAccount("acc_cash", "asset")).addAccount(new LedgerAccount("acc_payable", "liability"));
    const entries = [
      { accountId: "acc_cash", direction: "debit" as const, amountCents: 500 },
      { accountId: "acc_payable", direction: "credit" as const, amountCents: 500 },
    ];
    expect(l.post("tx_dup", entries)).toBe(true);
    expect(l.post("tx_dup", entries)).toBe(false);
    expect(l.hasPosted("tx_dup")).toBe(true);
  });
  it("unbalanced entries can never reach the repository", () => {
    expect(() => assertBalanced([
      { accountId: "a", direction: "debit", amountCents: 5 },
      { accountId: "b", direction: "credit", amountCents: 4 },
    ])).toThrow(/UNBALANCED/);
  });
  it("payroll is unavailable without reviewed rules (no fake payslips)", () => {
    const run = new SafePayrollRun("pr", "org", "RW", "2026-11-01", "2026-11-30");
    expect(() => run.calculate([], new PayrollRulesRegistry())).toThrow(/PAYROLL UNAVAILABLE/);
  });
  it("unscanned files are never accessible; scanner absence keeps them blocked", async () => {
    const f = new SecureFile("f1", "u1", "image/png", 1000);
    expect(f.isAccessible()).toBe(false); // pending_scan
    const svc = new FileLifecycleService(null);
    await svc.process(f);
    expect(f.scanState).toBe("scan_unavailable");
    expect(f.isAccessible()).toBe(false);
  });
});