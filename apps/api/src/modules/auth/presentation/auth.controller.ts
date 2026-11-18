import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AuthenticateUserUseCase } from '../application/authenticate-user.use-case';
import { RegisterUserUseCase } from '../../users/application/register-user.use-case';

@Controller('auth')
export class AuthController {
  constructor(private readonly authenticateUser: AuthenticateUserUseCase, private readonly registerUser: RegisterUserUseCase) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    // Whitelist fields explicitly. Never forward untrusted JSON properties
    // such as roles from the request body into the registration use case.
    const credentials = this.validateCredentials(body);
    await this.registerUser.execute(credentials);
    const session = await this.authenticateUser.execute(credentials);
    return { sessionToken: session.id, expiresAt: session.expiresAt };
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const credentials = this.validateCredentials(body);
    const session = await this.authenticateUser.execute(credentials);
    // The session id doubles as a bearer token (see security module's
    // AuthGuard) — this scaffold uses opaque session tokens rather than
    // JWTs. Swapping to JWT later only touches this boundary + AuthGuard.
    return { token: session.id, sessionToken: session.id, expiresAt: session.expiresAt };
  }

  private validateCredentials(body: { email: string; password: string } | undefined) {
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException("valid email is required");
    if (password.length < 8 || password.length > 256) throw new BadRequestException("password must contain 8-256 characters");
    return { email, password };
  }
}
