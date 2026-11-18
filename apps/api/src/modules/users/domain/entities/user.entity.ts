import { Role } from '../value-objects/role.enum';

export class User {
  private constructor(
    public readonly id: string,
    public readonly email: string,
    private readonly passwordHash: string,
    public readonly roles: Role[],
  ) {}

  static register(params: {
    id: string;
    email: string;
    passwordHash: string;
    roles?: Role[];
  }): User {
    return new User(params.id, params.email, params.passwordHash, params.roles ?? [Role.CUSTOMER]);
  }

  static restore(params: { id: string; email: string; passwordHash: string; roles: Role[] }): User {
    return new User(params.id, params.email, params.passwordHash, params.roles);
  }

  hasRole(role: Role): boolean {
    return this.roles.includes(role);
  }

  /**
   * Only for infrastructure-layer password verification (PasswordHasher).
   * Never include this in an API response DTO.
   */
  getPasswordHashForVerification(): string {
    return this.passwordHash;
  }
}
