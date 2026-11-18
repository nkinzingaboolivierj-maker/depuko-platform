import { ProviderEvent, WebhookProcessor } from "../domain/webhook";
import { Entry } from "../../finance/domain/ledger";
import { PostLedgerTransactionUseCase } from "../../finance/application/post-ledger-transaction.use-case";

export interface EventRecorder { recordOnce(eventId: string, provider: string): Promise<boolean>; }

/** Webhook -> ledger: the ONLY path to settled (S40/S56). Order of guarantees:
 * signature first, then PK-level dedup, then the balanced ledger post. */
export class ProcessWebhookUseCase {
  constructor(
    private readonly processor: WebhookProcessor,
    private readonly postLedger: PostLedgerTransactionUseCase,
    private readonly events?: EventRecorder,
  ) {}

  async execute(params: { event: ProviderEvent; signature: string }): Promise<{ status: string; txId: string | null }> {
    const r = this.processor.process(params.event, params.signature);
    if (r.status === "disabled") return { status: "disabled", txId: null };
    if (r.status === "duplicate") return { status: "duplicate", txId: null };
    if (this.events) {
      const first = await this.events.recordOnce(params.event.eventId, "configured_provider");
      if (!first) return { status: "duplicate", txId: null };
    }
    if (r.status === "settled") {
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
    return { status: r.status, txId: null };
  }
}