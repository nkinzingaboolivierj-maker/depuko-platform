import { Order } from "./entities/order.entity";

export const ORDER_REPOSITORY = "ORDER_REPOSITORY";

export interface OrderRepositoryPort {
  save(order: Order, idempotencyKey?: string): Promise<void>;
  findByIdForUser(id: string, customerId: string): Promise<Order | null>;
  findByIdempotencyKey(key: string, customerId: string): Promise<Order | null>;
  findByCustomer(customerId: string): Promise<Order[]>;
}