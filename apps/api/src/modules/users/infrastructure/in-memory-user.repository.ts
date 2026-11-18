import { Injectable } from '@nestjs/common';
import { User } from '../domain/entities/user.entity';
import { UserRepositoryPort } from '../domain/user.repository.port';

/** Test double only — never used in a real module wiring (§100). */
@Injectable()
export class InMemoryUserRepository implements UserRepositoryPort {
  private readonly byId = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.byId.set(user.id, user);
  }

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return [...this.byId.values()].find((u) => u.email === email) ?? null;
  }
}
