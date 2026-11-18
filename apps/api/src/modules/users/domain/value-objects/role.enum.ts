/**
 * Roles are intentionally coarse in this scaffold. Real authorization
 * (§51) will likely need ABAC on top of this for org-scoped / resource-scoped
 * permissions — this RBAC layer is the foundation, not the final model.
 */
export enum Role {
  CUSTOMER = 'customer',
  WORKER = 'worker',
  ADMIN = 'admin',
}
