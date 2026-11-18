/** Organization tenancy primitives. The directory is a pure domain/test helper;
 * production membership checks are enforced by OrganizationsController SQL. */
export type OrganizationRole = "owner" | "admin" | "finance" | "manager" | "staff";

export class Organization {
  private readonly members = new Map<string, OrganizationRole>();
  constructor(public readonly id: string, public readonly businessType: string) {
    if (!id || !businessType) throw new Error("organization identity required");
  }
  inviteMember(userId: string, role: OrganizationRole): void {
    if (!userId) throw new Error("user id required");
    if (!new Set(["owner", "admin", "finance", "manager", "staff"]).has(role)) throw new Error("invalid organization role");
    this.members.set(userId, role);
  }
  isMember(userId: string): boolean { return this.members.has(userId); }
  roleOf(userId: string): OrganizationRole | undefined { return this.members.get(userId); }
  assertAccess(userId: string): void {
    if (!this.isMember(userId)) throw new Error("not a member of this organization");
  }
}

export class OrgDirectory {
  private readonly organizations = new Map<string, Organization>();
  register(org: Organization): void {
    if (this.organizations.has(org.id)) throw new Error("organization already registered");
    this.organizations.set(org.id, org);
  }
  assertAccess(orgId: string, userId: string): Organization {
    const org = this.organizations.get(orgId);
    if (!org) throw new Error("organization not found");
    org.assertAccess(userId);
    return org;
  }
  financialRecords(orgId: string, userId: string): never {
    this.assertAccess(orgId, userId);
    throw new Error("financial records require the finance repository");
  }
}
