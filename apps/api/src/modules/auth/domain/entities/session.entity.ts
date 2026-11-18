/**
 * Domain entities hold business invariants. A session knows its own expiry
 * rule; nothing outside the domain layer should reimplement that logic.
 */
export class Session {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly issuedAt: Date,
    public readonly expiresAt: Date,
  ) {}

  static issue(params: { userId: string; ttlMinutes?: number }): Session {
    const issuedAt = new Date();
    const ttl = params.ttlMinutes ?? 60;
    const expiresAt = new Date(issuedAt.getTime() + ttl * 60_000);
    const id = `sess_${Math.random().toString(36).slice(2)}`;
    return new Session(id, params.userId, issuedAt, expiresAt);
  }

  /** Rehydrate a session from persistence — exact fields, no regeneration. */
  static restore(params: { id: string; userId: string; issuedAt: Date; expiresAt: Date }): Session {
    return new Session(params.id, params.userId, params.issuedAt, params.expiresAt);
  }

  isExpired(now: Date = new Date()): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }
}
