# DEPUKO PR #2 archive review — 2026-11-20

## Scope reviewed

Reviewed the user-supplied `release/navy-refresh-main-sync` archive (758 ZIP entries). The archive identifies itself as a V8 repair candidate and explicitly marks the release **NOT READY / NO-GO FOR PRODUCTION**. This review does not certify production readiness.

## Changes made in this review

- Hardened API CORS fallback in `apps/api/src/main.ts`: production no longer falls back to `origin: true` when `CORS_ORIGINS` and `FRONTEND_URL` are absent. In production, an empty allow-list disables cross-origin browser access; configured allow-lists continue to work. Development retains the permissive local-development fallback.

## Verification performed

| Check | Result | Evidence / limitation |
|---|---|---|
| ZIP extraction and inventory | PASS | 758 archive entries extracted successfully |
| TypeScript/TSX syntax parse | PASS | 241 files parsed with the installed TypeScript compiler API; zero syntax parse errors |
| API TypeScript typecheck | BLOCKED | `tsc --noEmit -p apps/api/tsconfig.json` reports missing `@nestjs/*`, `pg`, Node and Jest type packages because dependencies are not installed |
| Dependency install | BLOCKED | `corepack pnpm@9.15.9 install --no-frozen-lockfile` could not reach `registry.npmjs.org` (DNS `EAI_AGAIN`) |
| Jest | NOT RUN | Jest and its dependencies are not installed |
| PostgreSQL migrations | NOT RUN | No PostgreSQL/`psql` runtime available in this environment |
| HTTP E2E / tenant isolation | NOT RUN | API runtime and disposable database unavailable |
| Playwright / mobile / Docker | NOT RUN | Required runtimes are unavailable |

## Release blockers confirmed in the supplied source

1. **Payment settlement is not production-safe.** The current webhook flow records the replay marker before ledger posting in a separate operation, posts ledger entries without persisting a captured payment row, and does not transition the payment intent. The custom HMAC scheme is not verified against a real PSP's raw-body/signature contract. Keep real-money collection disabled.
2. **The four role journeys are incomplete.** The archive's own implementation audit marks Customer, Business, Admin and Worker experiences partial; onboarding, operational state transitions, availability, dispatch, staff management, training, support and complete end-to-end flows need implementation and verification.
3. **Registration and recurring billing are not complete.** The current public auth registration accepts email/password only and does not implement the agreed account-category registration charge plus a separate subscription lifecycle. No prices have been hard-coded; actual price points remain an admin/business decision after market review.
4. **Service publication is fail-closed.** A real simulation suite is still required before publishing services.
5. **Uploads and notifications are not production integrations.** Storage, malware scanning, email and SMS provider adapters/credentials and failure handling remain incomplete.
6. **Payroll is intentionally unavailable** until country-specific rules are reviewed by an identified human owner.
7. **Reproducible dependency installs are missing.** There is no `pnpm-lock.yaml`; generate and review it after networked dependency installation and security review.
8. **CI and deployment checks are not sufficient evidence.** Vercel preview readiness alone does not prove API, database, security, payments, mobile or full user-flow correctness.

## User-confirmed billing policy to implement

- Customer, Worker/Freelancer and Business/Company accounts each have a registration fee.
- Registration fee and subscription are separate obligations.
- Subscription plans and prices differ by account category and must be configurable by Admin.
- Do not invent or hard-code RWF prices yet. Agree prices after a Rwanda market/affordability review.

## Decision

**NO-GO for merge-to-main as a production release and NO-GO for real payments.** The CORS fallback hardening is a targeted repair, not completion of the marketplace. Do not merge PR #2 or enable public production traffic until the blockers above have passing automated and runtime evidence.
