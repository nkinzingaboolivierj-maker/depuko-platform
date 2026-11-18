import { Session } from './entities/session.entity';

/**
 * Ports (interfaces) live in the domain layer; implementations live in
 * infrastructure. This keeps the domain layer free of framework/DB concerns
 * and makes swapping persistence non-invasive.
 */
export interface SessionRepositoryPort {
  save(session: Session): Promise<void>;
  findById(id: string): Promise<Session | null>;
}

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
