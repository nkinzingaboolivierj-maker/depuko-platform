import { Module } from '@nestjs/common';
import { UsersController } from './presentation/users.controller';
import { RegisterUserUseCase } from './application/register-user.use-case';
import { VerifyCredentialsUseCase } from './application/verify-credentials.use-case';
import { PasswordHasher } from './infrastructure/password-hasher';
import { PgUserRepository } from './infrastructure/pg-user.repository';
import { USER_REPOSITORY } from './domain/user.repository.port';

@Module({
  controllers: [UsersController],
  providers: [
    RegisterUserUseCase,
    VerifyCredentialsUseCase,
    PasswordHasher,
    { provide: USER_REPOSITORY, useClass: PgUserRepository },
  ],
  exports: [RegisterUserUseCase, VerifyCredentialsUseCase, USER_REPOSITORY],
})
export class UsersModule {}
