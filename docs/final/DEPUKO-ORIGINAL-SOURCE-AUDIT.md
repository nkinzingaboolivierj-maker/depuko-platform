# DEPUKO Source Audit — V5 to V7.4

**Audit date:** 2026-11-17  
**Input:** `DEPUKO-SOURCE-PACK-FULL.zip`  
**SHA-256:** `CD7182105A9D15CDB28FE6529C663C004E6CCCF59C44C53541F9DB2FA3AD5A96`  
**Verdict:** **NO-GO — do not deploy this source package.**

## 1. Package integrity

The uploaded archive opens successfully, its ZIP CRC test passes, and it contains exactly seven expected entries:

- `build_depuko_v5.py` — 105,513 bytes
- `build_depuko_v6.py` — 97,806 bytes
- `build_depuko_v7.py` — 101,937 bytes
- `build_depuko_v7_2.py` — 47,494 bytes
- `build_depuko_v7_3.py` — 32,880 bytes
- `build_depuko_v7_4.py` — 38,716 bytes
- `DEPUKO-baseline.zip` — 99,942 bytes

The baseline ZIP contains 248 entries and passes its CRC test. No path-traversal entries were found in the baseline archive. Its README describes it as a Phase 1 scaffold: only auth, users, security and services are fleshed out; other modules are stubs.

## 2. Builder syntax defects

All six original builder files fail Python compilation because of unmatched triple-quote delimiters. In temporary audit copies only, the following orphan delimiters were removed; those six temporary copies then passed Python AST parsing and `py_compile`:

- V5: trailing `''')` at original line 2361
- V6: trailing `''')` at original line 2238
- V7: extra `''')` at original line 1494 and trailing `'''` at original line 2223
- V7.2: trailing `''')` at original line 1106
- V7.3: trailing `''')` at original line 738
- V7.4: trailing `''')` at original line 856

**The uploaded originals have not been altered.** Syntax-only repair does not make the builders functionally correct.

## 3. V5 build blocker — required files are absent

Running the syntax-repaired V5 builder in an isolated directory against the supplied baseline fails its own `REQUIRED_PRESENT` validation. Thirteen paths are missing:

1. `apps/api/src/modules/organizations/domain/tenant.ts`
2. `apps/api/src/modules/organizations/infrastructure/pg-org.repository.ts`
3. `apps/api/src/modules/organizations/presentation/organizations.controller.ts`
4. `apps/api/src/modules/business-onboarding/domain/templates.ts`
5. `apps/api/src/modules/business-onboarding/domain/onboarding-session.ts`
6. `apps/api/src/modules/business-onboarding/infrastructure/pg-onboarding.repository.ts`
7. `apps/api/src/modules/business-onboarding/presentation/business-onboarding.controller.ts`
8. `apps/api/src/modules/customers/domain/customer-profile.ts`
9. `apps/api/src/modules/customers/infrastructure/pg-customer.repository.ts`
10. `apps/api/src/modules/workforce/domain/worker-profile.ts`
11. `apps/api/src/modules/workforce/infrastructure/pg-worker.repository.ts`
12. `apps/api/src/modules/communication/domain/conversation.ts`
13. `apps/api/src/modules/communication/infrastructure/pg-conversation.repository.ts`

The V5 `app.module.ts` also imports five module files that are absent from the baseline and are not supplied by any of the six builders:

- `organizations/organizations.module.ts`
- `business-onboarding/business-onboarding.module.ts`
- `customers/customers.module.ts`
- `workforce/workforce.module.ts`
- `communication/communication.module.ts`

The V5 header describes the builder as self-contained and says the earlier V3/V4 layers are embedded, but these required modules/files are not present in the actual builder chain. Consequently the genuine V5 build cannot pass. The failed V5 run also leaves a partial `DEPUKO-FINAL/` directory behind; a rerun then refuses to overwrite it.

## 4. Controlled probe of later layers

To inspect whether later builders could run at all, a separate throwaway probe bypassed only V5's 13 missing-file assertions. V6, V7/V7.1, V7.2, V7.3 and V7.4 then produced ZIPs and their own file-presence/CRC checks passed, ending with 433 ZIP entries.

This is **not** a successful release build: the V5 validation was deliberately bypassed, and the resulting repository still contains missing modules and broken imports. The probe archive is not a deployable artifact and is not being presented as one.

## 5. Missing imports in the merged source

A static pass over the materialized output found 16 unresolved internal relative imports, including:

- The five missing modules listed in section 3
- Missing business-onboarding domain files (`onboarding-session`, `templates`)
- Missing organizations `tenant` model
- Missing communication `conversation` model
- Missing dispatch `dispatch-policy`, workforce repository port and workforce module
- Missing scheduling `assignment` domain model
- Missing contracts `contract` domain model
- A wrong relative import for `AuthGuard` in the notifications controller

The final `AppModule` therefore cannot compile as supplied.

## 6. UI-to-API mismatches and workflow defects

The V7.4 report says the screens are backed by real endpoints, but the merged code does not support several screen calls:

| Screen/action | Frontend call | Backend finding |
|---|---|---|
| Customer quotes | `GET /quotes`, `GET /quotes/:id`, `POST /quotes/:id/accept` | No Quotes controller/module or matching endpoints exists in the merged source. |
| Customer contracts list | `GET /contracts` | Contracts controller has `GET /contracts/:id`, but no collection/list endpoint. |
| Business services | `/organizations/:id/services` | Organizations controller/module is absent. |
| Business branches | `/organizations/:id/branches` | Organizations controller/module is absent. |
| Business staff | `/organizations/:id/members` | Organizations controller/module is absent. |
| Admin worker verification | `/workforce/workers/:id/verify` | Workforce controller/module is absent. |
| Worker earnings | `GET /payouts/mine` | No matching payouts controller/route exists. |
| Customer project services | `GET /projects/:id/services` | Projects controller implements `POST` for that route, not `GET`. |
| Customer reviews list | `GET /reviews` | Reviews controller has `GET /reviews/subjects/:subjectId`, not `GET /reviews`. |

Additional issues identified:

- `apps/worker-mobile/App.tsx` only implements login and assignments/check-in/out. It does not import or render the new V7.3/V7.4 screen components. `lib/screens.ts` is a descriptive registry and is not wired into `App.tsx`.
- Worker login sends only an email and reads `body.sessionToken`; the backend login expects both email and password and returns `token`, not `sessionToken`.
- The customer registration helper calls `/auth/register`, while the supplied backend does not expose that route.
- Business Orders reuses `GET /orders`; the backend implementation is `findByCustomer(userId)`, not an organization-scoped business order listing.
- Review code comments say completed-work eligibility is enforced, but the controller constructs and saves a review directly; the repository only inserts it and enforces duplicate uniqueness. No completed-order check is performed in that request path.
- Worker Opportunities accepts `verifiedSkills` from the client request body and the worker UI lets the worker type them in. The backend does not load a verified skills snapshot from the workforce/capabilities source. The applicant can also call the application `advance` endpoint for their own application.
- Payment intent status lookup fetches by intent ID without checking that the requester owns the related order/intent.
- Refund creation is guarded by the admin-only `payments:refund` permission, while the customer UI presents it as a customer refund request. The UI also calls the helper with an undefined/zero amount. This is not a valid customer refund-request flow.
- The payments webhook controller does not await the Promise returned by `ProcessWebhookUseCase.execute`; this is a TypeScript error and the response handling is not correct.

## 7. TypeScript and environment verification

A TypeScript check was attempted against the materialized source using the available global compiler. It did not pass. The environment does not have the project's npm dependencies installed, so many diagnostics concern missing NestJS, `pg`, Node and Jest types. However, the compiler also exposed code-level errors, including:

- `pg-ledger.repository.ts`: query result generic is declared as an array-of-arrays, then `.net` is accessed on an array.
- `pg-stock.repository.ts`: similar result generic/type errors (`StockRow[]` used where a row type is expected).
- `pg-processed-events.repository.ts`: similar `inserted` result-type error.
- `payments.controller.ts`: accesses `.status` and `.txId` on a Promise without awaiting it.
- Additional strict-mode unused imports/parameters and implicit-any errors.

Jest, HTTP E2E, Playwright and PostgreSQL migrations were **not run**. The sandbox has no `psql`, `postgres` or Docker binary, and dependency installation could not reach the npm registry. No deployment was attempted.

## 8. Required engineering fixes before deployment

1. Repair the six builder syntax defects in the authoritative source files, not only in temporary copies.
2. Implement the 13 V5-required files and five missing NestJS modules; add the missing worker, dispatch, scheduling and contract domain imports.
3. Implement the missing quote endpoints, contracts list endpoint, organization/business endpoints, workforce verification, payouts route, projects list route and reviews list route—or remove/disable the UI actions that cannot be supported.
4. Correct auth request/response contract, worker navigation and screen registration.
5. Enforce server-side tenant membership and organization scoping for all business operations.
6. Enforce completed-work review eligibility in the backend, derive worker verified skills from server records, and restrict application-stage advancement to the authorized business/admin workflow.
7. Correct payment ownership, refund request/approval separation, idempotency, and await webhook processing. Keep real money disabled until a real PSP sandbox and signed webhooks are verified.
8. Correct TypeScript errors, then install dependencies and run the complete test matrix.
9. Run migrations 0001–0014 against a fresh and upgraded PostgreSQL database; test restore/backup; deploy to staging; complete smoke and browser tests before production.

## Final decision

**Current status: NOT READY / NO-GO.** The uploaded source archive is intact, but its builders and merged application are not production-ready. No GitHub-ready release or production deployment should be created from this chain until the missing implementation and workflow/security defects above are fixed and verified with real test output.
