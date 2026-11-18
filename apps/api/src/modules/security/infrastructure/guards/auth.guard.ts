import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepositoryPort } from '../../../auth/domain/session.repository.port';

/**
 * Resolves an opaque bearer token (a session id — see auth.controller.ts)
 * to a real, non-expired session, then attaches userId to the request.
 * This is real session lookup against Postgres (via SessionRepositoryPort),
 * not a stubbed check (§4: never fake security verification).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const session = await this.sessions.findById(token);
    if (!session || session.isExpired()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    request.userId = session.userId;
    return true;
  }
}
