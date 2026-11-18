import { PaymentIntent, Refund } from "./payment-state";

export const PAYMENTS_REPOSITORY = "PAYMENTS_REPOSITORY";

export interface PaymentsRepositoryPort {
  createIntent(params: { id: string; orderId: string; amountCents: number; currency: string; provider: string }): Promise<PaymentIntent>;
  findIntentById(id: string): Promise<PaymentIntent | null>;
  requireIntent(id: string): Promise<PaymentIntent>;
  saveIntent(intent: PaymentIntent): Promise<void>;
  recordPayment(params: { id: string; intentId: string; orderId: string; amountCents: number; currency: string; provider: string; providerReference: string | null }): Promise<void>;
  requestRefund(params: { id: string; intentId: string; paymentId: string; amountCents: number; currency: string; reason?: string }): Promise<void>;
  saveRefund(refund: Refund): Promise<void>;
  listRefunds(intentId: string): Promise<Refund[]>;
}