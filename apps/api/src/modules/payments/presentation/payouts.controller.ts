import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";

/** Worker reads only their own payout ledger rows. This is history, not a release action. */
@Controller("payouts")
@UseGuards(AuthGuard)
export class PayoutsController {
  constructor(private readonly db: DatabaseService) {}
  @Get("mine")
  async mine(@Req() req: { userId: string }) {
    const payouts = await this.db.query<{ id: string; amount_cents: string | number; currency: string; status: string; created_at: Date }>(
      `SELECT p.id, p.amount_cents, p.currency, p.status, p.created_at
       FROM payouts p
       JOIN worker_profiles w ON w.user_id=$1 AND p.worker_profile_id=w.user_id
       ORDER BY p.created_at DESC LIMIT 100`,
      [req.userId],
    );
    return { payouts: payouts.map(p => ({ ...p, amount_cents: Number(p.amount_cents) })) };
  }
}
