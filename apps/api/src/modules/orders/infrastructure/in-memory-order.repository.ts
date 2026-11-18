import { Order } from "../domain/entities/order.entity";
import { OrderRepositoryPort } from "../domain/order.repository.port";

/** TEST implementation only (NODE_ENV=test). Production uses PgOrderRepository. */
export class InMemoryOrderRepository implements OrderRepositoryPort {
  private readonly rows = new Map<string, { order: Order; idem: string | null }>();

  private copy(o: Order): Order {
    return new Order(o.id, o.customerId, o.priceCents, o.serviceDefinitionId, o.serviceVersionId, o.currency, o.status);
  }
  async save(order: Order, idempotencyKey?: string): Promise<void> {
    this.rows.set(order.id, { order: this.copy(order), idem: idempotencyKey ?? this.rows.get(order.id)?.idem ?? null });
  }
  async findByIdForUser(id: string, customerId: string): Promise<Order | null> {
    const r = this.rows.get(id);
    return r && r.order.customerId === customerId ? this.copy(r.order) : null;
  }
  async findByIdempotencyKey(key: string, customerId: string): Promise<Order | null> {
    for (const r of this.rows.values()) {
      if (r.idem === key && r.order.customerId === customerId) return this.copy(r.order);
    }
    return null;
  }
  async findByCustomer(customerId: string): Promise<Order[]> {
    return [...this.rows.values()].filter(r => r.order.customerId === customerId).map(r => this.copy(r.order));
  }
}