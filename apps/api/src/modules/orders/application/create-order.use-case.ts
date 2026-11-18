import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { Order } from "../domain/entities/order.entity";
import { ORDER_REPOSITORY, OrderRepositoryPort } from "../domain/order.repository.port";

/** Idempotent order creation (S55): the same key + customer returns the
 * original order instead of creating a second one. */
@Injectable()
export class CreateOrderUseCase {
  constructor(@Inject(ORDER_REPOSITORY) private readonly orders: OrderRepositoryPort) {}

  async execute(params: {
    customerId: string;
    serviceDefinitionId: string;
    serviceVersionId: string;
    priceCents: number;
    currency?: string;
    idempotencyKey: string;
  }): Promise<{ id: string; status: string; deduplicated: boolean }> {
    const existing = await this.orders.findByIdempotencyKey(params.idempotencyKey, params.customerId);
    if (existing) return { id: existing.id, status: existing.status, deduplicated: true };
    const order = new Order(randomUUID(), params.customerId, params.priceCents,
      params.serviceDefinitionId, params.serviceVersionId, params.currency ?? "RWF");
    await this.orders.save(order, params.idempotencyKey);
    return { id: order.id, status: order.status, deduplicated: false };
  }
}