import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../infrastructure/database/database.service';
import { User } from '../domain/entities/user.entity';
import { Role } from '../domain/value-objects/role.enum';
import { UserRepositoryPort } from '../domain/user.repository.port';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  roles: Role[];
}

function toDomain(row: UserRow): User {
  return User.restore({ id: row.id, email: row.email, passwordHash: row.password_hash, roles: row.roles });
}

@Injectable()
export class PgUserRepository implements UserRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async save(user: User): Promise<void> {
    await this.db.query(
      `INSERT INTO users (id, email, password_hash, roles)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles`,
      [user.id, user.email, user.getPasswordHashForVerification(), user.roles],
    );
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ? toDomain(rows[0]) : null;
  }
}
