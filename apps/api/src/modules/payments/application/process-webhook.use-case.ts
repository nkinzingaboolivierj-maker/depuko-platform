import { ProviderEvent, WebhookProcessor } from "../domain/webhook";
import { Entry } from "../../finance/domain/ledger";
import { PostLedgerTransactionUseCase } from "../../finance/application/post-ledger-transaction.use-case";

export interface EventRecorder { recordOnce(eventId: string, provider: string): Promise<boolean>; }
export interface WebhookSettlementPort { settleWebhook(event: ProviderEvent): Promise<{ status: string; txId: string | null }>; }

export class ProcessWebhookUseCase {
  constructor(
    private readonly processor: WebhookProcessor,
    private readonly postLedger: PostLedgerTransactionUseCase,
    private readonly events?: EventRecorder,
    private readonly settlement?: WebhookSettlementPort,
  ) {}

  async execute(params: { event: ProviderEvent; signature: string }): Promise<{ status: string; txId: string | null }> {
    const verified = this.processor.process(params.event, params.signature);
    if (verified.status === "disabled") return { status: "disabled", txId: null };
    if (verified.status === "duplicate") return { status: "duplicate", txId: null };

    // Production uses one database transaction for deduplication, payment capture,
    // payment-intent state and ledger entries. Any error rolls back all of them.
    if (this.settlement) return this.settlement.settleWebhook(params.event);

    // Kept for isolated unit tests and non-production adapters only.
    if (this.events) {
      const first = await this.events.recordOnce(params.event.eventId, "configured_provider");
      if (!first) return { status: "duplicate", txId: null };
    }
    if (verified.status === "settled") {
      const entries: Entry[] = [
        { accountId: "acc_cash", direction: "debit", amountCents: params.event.amountCents },
        { accountId: "acc_payable", direction: "credit", amountCents: params.event.amountCents },
      ];
      const posted = await this.postLedger.execute({
        txId: "ledger_payment_" + params.event.eventId,
        description: "customer payment settled",
        entries,
      });
      return { status: "settled", txId: posted.txId };
    }
    return { status: verified.status, txId: null };
  }
}