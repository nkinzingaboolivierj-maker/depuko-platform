import { Module } from '@nestjs/common';
import { AuthController } from './presentation/auth.controller';
import { AuthenticateUserUseCase } from './application/authenticate-user.use-case';
import { PgSessionRepository } from './infrastructure/pg-session.repository';
import { SESSION_REPOSITORY } from './domain/session.repository.port';
import { UsersModule } from '../users/users.module';

/**
 * Auth module — session issuance and validation.
 *
 * Owns: session lifecycle. Does NOT own: credential verification (delegated
 * to users/VerifyCredentialsUseCase) or authorization/permission decisions
 * (owned by the security module's PermissionPolicy, §11).
 */
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthenticateUserUseCase,
    { provide: SESSION_REPOSITORY, useClass: PgSessionRepository },
  ],
  exports: [AuthenticateUserUseCase, SESSION_REPOSITORY],
})
export class AuthModule {}
