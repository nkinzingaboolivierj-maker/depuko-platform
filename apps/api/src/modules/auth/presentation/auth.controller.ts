import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { AuthenticateUserUseCase } from "../application/authenticate-user.use-case";
import { RegisterUserUseCase } from "../../users/application/register-user.use-case";
import { Role } from "../../users/domain/value-objects/role.enum";

@Controller("auth")
export class AuthController {
  constructor(private readonly authenticateUser: AuthenticateUserUseCase, private readonly registerUser: RegisterUserUseCase) {}

  @Post("register")
  async register(@Body() body: { email: string; password: string; accountType?: "customer" | "worker" }) {
    const credentials = this.validateCredentials(body);
    // Public registration can request only customer or worker. Admin roles are
    // never accepted from client input; business ownership is granted through
    // the organization-membership workflow after account creation.
    const role = body.accountType === "worker" ? Role.WORKER : Role.CUSTOMER;
    await this.registerUser.execute({ ...credentials, roles: [role] });
    const session = await this.authenticateUser.execute(credentials);
    return { sessionToken: session.id, expiresAt: session.expiresAt, accountType: role };
  }

  @Post("login")
  async login(@Body() body: { email: string; password: string }) {
    const credentials = this.validateCredentials(body);
    const session = await this.authenticateUser.execute(credentials);
    return { token: session.id, sessionToken: session.id, expiresAt: session.expiresAt };
  }

  private validateCredentials(body: { email: string; password: string } | undefined) {
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