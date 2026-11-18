import { Role } from "../../users/domain/value-objects/role.enum";

/**
 * Central high-impact action table (S47). V7.1 additions: analytics:read
 * (measured aggregates only), integrations:manage (registry metadata),
 * skills:verify (human verification of worker competence). Unknown actions
 * still fail closed.
 */
const POLICY: Record<string, Role[]> = {
  "services:publish": [Role.ADMIN],
  "payments:refund": [Role.ADMIN],
  "payouts:release": [Role.ADMIN],
  "workers:suspend": [Role.ADMIN],
  "pricing:change": [Role.ADMIN],
  "business:verify": [Role.ADMIN],
  "business_templates:create": [Role.ADMIN],
  "finance:read": [Role.ADMIN],
  "analytics:read": [Role.ADMIN],
  "integrations:manage": [Role.ADMIN],
  "skills:verify": [Role.ADMIN],
};

export class PermissionPolicy {
  /** Unknown actions fail closed, not open (S4). */
  static isAllowed(action: string, roles: Role[]): boolean {
    const allowedRoles = POLICY[action];
    if (!allowedRoles) return false;
    return roles.some((r) => allowedRoles.includes(r));
  }

  static knownActions(): string[] {
    return Object.keys(POLICY);
  }
}