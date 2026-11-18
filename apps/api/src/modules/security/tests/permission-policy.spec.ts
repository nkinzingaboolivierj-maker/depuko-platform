import { PermissionPolicy } from "../domain/permission-policy";
import { Role } from "../../users/domain/value-objects/role.enum";

describe("PermissionPolicy (S47, V5 finance:read)", () => {
  it("admins hold every known action; unknown actions fail CLOSED", () => {
    for (const action of PermissionPolicy.knownActions()) {
      expect(PermissionPolicy.isAllowed(action, [Role.ADMIN])).toBe(true);
    }
    expect(PermissionPolicy.isAllowed("totally:unknown", [Role.ADMIN])).toBe(false);
  });
  it("finance:read is granted to admins but NOT to customers", () => {
    expect(PermissionPolicy.isAllowed("finance:read", [Role.ADMIN])).toBe(true);
    expect(PermissionPolicy.isAllowed("finance:read", [Role.CUSTOMER])).toBe(false);
  });
  it("no role list => deny", () => {
    expect(PermissionPolicy.isAllowed("finance:read", [])).toBe(false);
  });
});