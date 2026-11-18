import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { User } from '../domain/entities/user.entity';
import { Role } from '../domain/value-objects/role.enum';
import { USER_REPOSITORY, UserRepositoryPort } from '../domain/user.repository.port';
import { PasswordHasher } from '../infrastructure/password-hasher';

interface RegisterUserInput {
  email: string;
  password: string;
  roles?: Role[];
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: RegisterUserInput) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hasher.hash(input.password);
    const user = User.register({
      id: `user_${Math.random().toString(36).slice(2)}`,
      email: input.email,
      passwordHash,
      roles: input.roles,
    });
    await this.users.save(user);

    // Never return passwordHash — this is the DTO boundary.
    return { id: user.id, email: user.email, roles: user.roles };
  }
}
