import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { LEDGER_REPOSITORY, LedgerRepositoryPort } from "../domain/ledger.repository.port";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../../security/infrastructure/guards/permission.guard";
import { RequirePermission } from "../../security/infrastructure/guards/require-permission.decorator";

/** V5 fix #7: ledger reads require the read-only finance:read permission. */
@Controller("finance")
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission("finance:read")
export class FinanceController {
  constructor(@Inject(LEDGER_REPOSITORY) private readonly ledger: LedgerRepositoryPort) {}

  @Get("accounts")
  async accounts() {
    return { accounts: await this.ledger.accounts(), balances: await this.ledger.balances() };
  }

  @Get("balance-check")
  async balanceCheck() {
    const rows = await this.ledger.balanceCheck();
    const unbalanced = rows.filter(r => Number(r.net_cents) !== 0);
    return { checked: rows.length, unbalanced, healthy: unbalanced.length === 0 };
  }
}