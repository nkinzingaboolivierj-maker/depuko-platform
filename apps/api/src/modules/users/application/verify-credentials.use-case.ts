import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '../domain/entities/user.entity';
import { USER_REPOSITORY, UserRepositoryPort } from '../domain/user.repository.port';
import { PasswordHasher } from '../infrastructure/password-hasher';

interface VerifyCredentialsInput {
  email: string;
  password: string;
}

/**
 * Exported for AuthModule to use during login (§11: identity domain owns
 * identity). Auth issues sessions; it never verifies passwords itself.
 */
@Injectable()
export class VerifyCredentialsUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: VerifyCredentialsInput): Promise<User> {
    const user = await this.users.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await this.hasher.compare(input.password, user.getPasswordHashForVerification());
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
