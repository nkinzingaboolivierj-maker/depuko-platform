import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { Order } from "../domain/entities/order.entity";
import { OrderRepositoryPort } from "../domain/order.repository.port";

interface OrderRow {
  id: string; customer_id: string; service_definition_id: string;
  service_version_id: string; price_amount_cents: string | number;
  price_currency: string; status: string;
}

function toDomain(row: OrderRow): Order {
  return new Order(row.id, row.customer_id, Number(row.price_amount_cents),
    row.service_definition_id, row.service_version_id, row.price_currency, row.status);
}

const SELECT = `SELECT id, customer_id, service_definition_id, service_version_id,
 price_amount_cents, price_currency, status FROM orders`;

/** Real persistence (migration 0003). BOLA is blocked IN SQL: every read is
 * scoped to the requesting customer. Idempotency = UNIQUE(idempotency_key). */
@Injectable()
export class PgOrderRepository implements OrderRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async save(order: Order, idempotencyKey?: string): Promise<void> {
    await this.db.query(
      `INSERT INTO orders (id, customer_id, service_definition_id, service_version_id,
                            status, price_amount_cents, price_currency, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()`,
      [order.id, order.customerId, order.serviceDefinitionId, order.serviceVersionId,
       order.status, order.priceCents, order.currency, idempotencyKey ?? null],
    );
  }

  async findByIdForUser(id: string, customerId: string): Promise<Order | null> {
    const rows = await this.db.query<OrderRow>(SELECT + ` WHERE id = $1 AND customer_id = $2`, [id, customerId]);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByIdempotencyKey(key: string, customerId: string): Promise<Order | null> {
    const rows = await this.db.query<OrderRow>(SELECT + ` WHERE idempotency_key = $1 AND customer_id = $2`, [key, customerId]);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    const rows = await this.db.query<OrderRow>(SELECT + ` WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 100`, [customerId]);
    return rows.map(toDomain);
  }
}