import { Order } from "../domain/entities/order.entity";
import { TransitionOrderUseCase } from "../application/transition-order.use-case";
import { CreateOrderUseCase } from "../application/create-order.use-case";
import { validateCreateOrderDto } from "../application/create-order.dto";
import { InMemoryOrderRepository } from "../infrastructure/in-memory-order.repository";
import { InMemoryAuditLog } from "../../audit/audit-log.service";
import { NotFoundException } from "@nestjs/common";

describe("Order state machine (S11/S54)", () => {
  it("walks the happy path", () => {
    const o = new Order("o1", "c1", 25000, "sd1", "sv1");
    o.confirm(); o.start(); o.complete();
    expect(o.status).toBe("completed");
  });
  it("rejects illegal transitions and bad prices", () => {
    const o = new Order("o1", "c1", 100, "sd1", "sv1");
    expect(() => o.start()).toThrow(/illegal/);
    o.cancel();
    expect(() => o.confirm()).toThrow(/illegal/);
    expect(() => new Order("o", "c", 0, "sd", "sv")).toThrow(/price/);
    expect(() => new Order("o", "c", 10.5, "sd", "sv")).toThrow(/price/);
  });
});

describe("TransitionOrderUseCase - BOLA + audit (S49/S72)", () => {
  function harness() {
    const repo = new InMemoryOrderRepository();
    const audit = new InMemoryAuditLog();
    return { repo, audit, uc: new TransitionOrderUseCase(repo, audit) };
  }
  it("owner transitions their order; every action is audited", async () => {
    const { repo, audit, uc } = harness();
    await repo.save(new Order("o1", "c1", 5000, "sd", "sv"));
    await uc.execute({ orderId: "o1", userId: "c1", command: "confirm" });
    const r = await uc.execute({ orderId: "o1", userId: "c1", command: "start" });
    expect(r.status).toBe("in_progress");
    expect(audit.events.length).toBe(2);
  });
  it("another user gets the SAME 404 as a missing order", async () => {
    const { repo, uc } = harness();
    await repo.save(new Order("o1", "c1", 5000, "sd", "sv"));
    await expect(uc.execute({ orderId: "o1", userId: "c2", command: "confirm" })).rejects.toThrow(NotFoundException);
    await expect(uc.execute({ orderId: "missing", userId: "c1", command: "confirm" })).rejects.toThrow(NotFoundException);
  });
});

describe("CreateOrderUseCase - idempotency (S55)", () => {
  it("same key returns the original order", async () => {
    const repo = new InMemoryOrderRepository();
    const uc = new CreateOrderUseCase(repo);
    const p = { customerId: "c1", serviceDefinitionId: "sd", serviceVersionId: "sv", priceCents: 1000, idempotencyKey: "key-12345678" };
    const first = await uc.execute(p);
    const second = await uc.execute(p);
    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(true);
    expect(second.id).toBe(first.id);
  });
  it("DTO validation rejects bad input", () => {
    expect(validateCreateOrderDto({}).length).toBeGreaterThanOrEqual(4);
    expect(validateCreateOrderDto({ serviceDefinitionId: "sd", serviceVersionId: "sv", priceCents: 5, idempotencyKey: "12345678" })).toEqual([]);
  });
});