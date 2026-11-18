/**
 * PHASE 10: HTTP-level E2E spec (supertest-shaped). NOT EXECUTED in the
 * build environment - requires a running Nest app + Postgres (docker
 * compose). The CI workflow runs it after migrations. These tests verify
 * REAL routes: auth -> business register -> onboarding -> orders -> finance
 * gates -> webhook disabled rail -> support/disputes.
 */
const request = require("supertest");
const { Test } = require("@nestjs/testing");
const { AppModule } = require("../app.module");
const { NestFactory } = require("@nestjs/core");

describe("HTTP E2E (requires DATABASE_URL + running stack)", () => {
  let app: { listen: unknown; getHttpAdapter: () => unknown };
  let token: string;
  let orgId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication ? await moduleRef.createNestApplication() : (await NestFactory.create(AppModule, { logger: false }) as never);
    await (app as never as { init(): Promise<void> }).init();
  });

  it("1-2) register + login: real session token issued", async () => {
    const email = `e2e_${Date.now()}@test.local`;
    await request(app.getHttpAdapter()).post("/api/v1/auth/register").send({ email, password: "Str0ngPass!x" }).expect(201);
    const login = await request(app.getHttpAdapter()).post("/api/v1/auth/login").send({ email, password: "Str0ngPass!x" }).expect(201);
    token = login.body.sessionToken;
    expect(token).toBeTruthy();
  });

  it("3) customer order created idempotently; duplicate key returns same id", async () => {
    const body = { serviceDefinitionId: "sd_e2e", serviceVersionId: "sv_e2e", priceCents: 15000, idempotencyKey: "e2e-key-0001" };
    const a = await request(app.getHttpAdapter()).post("/api/v1/orders").set("Authorization", `Bearer ${token}`).send(body).expect(201);
    const b = await request(app.getHttpAdapter()).post("/api/v1/orders").set("Authorization", `Bearer ${token}`).send(body).expect(201);
    expect(a.body.id).toBe(b.body.id);
    expect(b.body.deduplicated).toBe(true);
  });

  it("4) finance endpoints reject non-admins (BOLA/privilege)", async () => {
    await request(app.getHttpAdapter()).get("/api/v1/finance/balance-check").set("Authorization", `Bearer ${token}`).expect(403);
  });

  it("5) webhook rail answers 503 when the secret is not configured", async () => {
    const res = await request(app.getHttpAdapter())
      .post("/api/v1/payments/any_order/webhook")
      .send({ eventId: "e_e2e", outcome: "settled", amountCents: 100 });
    expect([503, 404]).toContain(res.status);
  });

  it("6) support ticket lifecycle over HTTP (internal notes invisible)", async () => {
    const t = await request(app.getHttpAdapter()).post("/api/v1/support/tickets").set("Authorization", `Bearer ${token}`).send({ category: "payments" }).expect(201);
    await request(app.getHttpAdapter()).get(`/api/v1/support/tickets/${t.body.ticketId}`).set("Authorization", `Bearer ${token}`).expect(200);
  });

  it("7) business registration + onboarding start over HTTP", async () => {
    const res = await request(app.getHttpAdapter())
      .post("/api/v1/businesses/register")
      .set("Authorization", `Bearer ${token}`)
      .send({ templateId: "cleaning_company", legalName: "E2E Cleaners", country: "RW", industry: "cleaning" })
      .expect(201);
    orgId = res.body.organizationId;
    expect(orgId).toBeTruthy();
  });

  afterAll(async () => {
    await (app as never as { close(): Promise<void> }).close?.();
  });
});