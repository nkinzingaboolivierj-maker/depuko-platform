import { randomUUID } from "node:crypto";
import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { AuthenticateUserUseCase } from "../application/authenticate-user.use-case";
import { RegisterUserUseCase } from "../../users/application/register-user.use-case";
import { Role } from "../../users/domain/value-objects/role.enum";
import { DatabaseService } from "../../../infrastructure/database/database.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authenticateUser: AuthenticateUserUseCase,
    private readonly registerUser: RegisterUserUseCase,
    private readonly db: DatabaseService,
  ) {}

  @Post("register")
  async register(@Body() body: { email: string; password: string; accountType?: "customer" | "worker" }) {
    const credentials = this.validateCredentials(body);
    // Public registration can request only customer or worker. Admin roles are
    // never accepted from client input; business ownership is granted through
    // the organization-membership workflow after account creation.
    const role = body.accountType === "worker" ? Role.WORKER : Role.CUSTOMER;
    const user = await this.registerUser.execute({ ...credentials, roles: [role] });
    const audience = role === Role.WORKER ? "worker" : "customer";
    const configured = await this.db.query<{ id: string; amount_cents: string | number; currency: string }>(
      "SELECT id,amount_cents,currency FROM billing_catalog_items WHERE kind='registration_fee' AND audience=$1 AND active=TRUE ORDER BY updated_at DESC LIMIT 1",
      [audience],
    );
    let registrationFee: { id: string; amountCents: number; currency: string; status: string } | null = null;
    if (configured[0]) {
      const price = configured[0];
      const feeId = "fee_" + randomUUID();
      await this.db.query(
        "INSERT INTO registration_fee_obligations (id,user_id,audience,catalog_item_id,amount_cents,currency) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id,audience) DO NOTHING",
        [feeId,user.id,audience,price.id,Number(price.amount_cents),price.currency],
      );
      const fee = await this.db.query<{ id: string; amount_cents: string | number; currency: string; status: string }>(
        "SELECT id,amount_cents,currency,status FROM registration_fee_obligations WHERE user_id=$1 AND audience=$2",
        [user.id,audience],
      );
      if (fee[0]) registrationFee = { id: fee[0].id, amountCents: Number(fee[0].amount_cents), currency: fee[0].currency, status: fee[0].status };
    }
    const session = await this.authenticateUser.execute(credentials);
    return { sessionToken: session.id, expiresAt: session.expiresAt, accountType: role, registrationFee };
  }

  @Post("login")
  async login(@Body() body: { email: string; password: string }) {
    const credentials = this.validateCredentials(body);
    const session = await this.authenticateUser.execute(credentials);
    return { token: session.id, sessionToken: session.id, expiresAt: session.expiresAt };
  }

  private validateCredentials(body: { email: string; password: string; accountType?: "customer" | "worker" } | undefined) {
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException("valid email is required");
    if (password.length < 8 || password.length > 256) throw new BadRequestException("password must contain 8-256 characters");
    if (body && body.accountType !== undefined && body.accountType !== "customer" && body.accountType !== "worker") {
      throw new BadRequestException("accountType must be customer or worker");
    }
    return { email, password };
  }
}