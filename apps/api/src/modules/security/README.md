# security module

**Status:** implemented (Phase 2 slice) — RBAC policy engine + guards.
`domain/permission-policy.ts` holds the single table of role→action
permissions (§47). `AuthGuard` resolves a real session from Postgres;
`PermissionGuard` checks the authenticated user's real roles against that
table. Apply both plus `@RequirePermission('some:action')` to any high-risk
route — see `services/presentation/service-definitions.controller.ts`'s
publish endpoint for the pattern.

**Not yet implemented:** ABAC (resource/org-scoped permissions — §51 lists
this alongside RBAC as a requirement), MFA/passkey step-up auth (§67's
security golden test needs this), and audit logging of authorization
decisions (§47, §81).
