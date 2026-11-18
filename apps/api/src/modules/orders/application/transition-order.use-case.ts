import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ORDER_REPOSITORY, OrderRepositoryPort } from "../domain/order.repository.port";
import { AUDIT_LOG, AuditLogPort } from "../../audit/audit-log.service";

export type OrderCommand = "confirm" | "start" | "complete" | "cancel";

/** BOLA-safe: not-yours and not-found are the SAME 404 (no existence leak).
 * Every transition is audited. */
@Injectable()
export class TransitionOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepositoryPort,
    @Inject(AUDIT_LOG) private readonly audit: AuditLogPort,
  ) {}

  async execute(params: { orderId: string; userId: string; command: OrderCommand }): Promise<{ id: string; status: string }> {
    const found = await this.orders.findByIdForUser(params.orderId, params.userId);
    if (!found) throw new NotFoundException("order not found");
    found[params.command]();
    await this.orders.save(found);
    await this.audit.record({ actorUserId: params.userId, action: "order." + params.command, payload: { orderId: params.orderId, newStatus: found.status } });
    return { id: found.id, status: found.status };
  }
}