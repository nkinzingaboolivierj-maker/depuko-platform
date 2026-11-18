import { Inject, Injectable } from '@nestjs/common';
import { Session } from '../domain/entities/session.entity';
import { SESSION_REPOSITORY, SessionRepositoryPort } from '../domain/session.repository.port';
import { VerifyCredentialsUseCase } from '../../users/application/verify-credentials.use-case';

interface AuthenticateUserInput {
  email: string;
  password: string;
}

/**
 * Auth orchestrates login; identity/credentials are the users module's
 * responsibility (§11). This use case never touches a password hash
 * directly — it delegates to VerifyCredentialsUseCase and only handles what
 * happens once credentials are confirmed valid: issuing a session.
 */
@Injectable()
export class AuthenticateUserUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: SessionRepositoryPort,
    private readonly verifyCredentials: VerifyCredentialsUseCase,
  ) {}

  async execute(input: AuthenticateUserInput): Promise<Session> {
    const user = await this.verifyCredentials.execute(input);
    const session = Session.issue({ userId: user.id });
    await this.sessions.save(session);
    return session;
  }
}
