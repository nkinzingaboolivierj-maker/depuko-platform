# DEPUKO release status and Railway environment audit — 2026-11-21

## Release state

- Repository: `nkinzingaboolivierj-maker/depuko-platform`
- Pull request: [PR #2](https://github.com/nkinzingaboolivierj-maker/depuko-platform/pull/2)
- Release branch: `release/navy-refresh-main-sync`
- Base branch: `main`
- Branch is mergeable, but PR #2 remains open and unmerged.
- Production Railway API remains on `main` at the existing production commit. The release branch has **not** been deployed to production.
- Railway currently has a Production environment only; no separate staging environment was found.

## CI evidence

The latest completed CI run before this report (run 63) passed:

- Dependency installation and generated pnpm lockfile.
- Fresh PostgreSQL migration sequence.
- Upgrade migration sequence (0016 baseline followed by 0017 onward).
- TypeScript checks for API, Customer, Admin and Worker Mobile.
- Workspace builds, including an Expo Android JavaScript bundle export.
- API unit tests: **30 suites, 104 tests passed**.

The generated `pnpm-lock.yaml` was committed to the release branch by the CI workflow. A subsequent run is required to verify the new branch head with `pnpm install --frozen-lockfile`.

These results do not certify browser E2E, tenant isolation, live provider integrations, mobile-device acceptance, or production database migration. HTTP E2E tests remain excluded from the unit-test command.

## Changes included in the release branch

- Corrected Admin TypeScript configuration and auth/session dependency wiring in Billing, Training and Files modules.
- Corrected analytics metric aggregation.
- Kept service publication fail-closed until its simulation gate passes; tests cover unpublished and already-verified services.
- Added Worker Mobile Expo configuration, secure session persistence, training course enrollment/progress and a build/typecheck path.
- Aligned the Worker Mobile React Native version with Expo SDK 51 and added supported AsyncStorage/Babel runtime dependencies.
- Added Railway S3 virtual-hosted URL signing support, optional path-style compatibility, and presign tests.
- Applied the strict navy/white palette override to the Customer landing interface.
- Added the missing `NEXT_PUBLIC_API_BASE_URL` to the Vercel project `project-ivk8j`.

## Railway Production inventory

Project: `1e0347d0-77c1-400a-abce-72360cb24135`

Environment: `b4969f32-1f12-4dab-b7da-146ea6f34c44`

- API service: `9072b2f2-b9e6-4b4b-b0b1-b6f53101c1cb`
- PostgreSQL service: `815029a1-5f57-4714-ac97-fc341d3235c5`
- Public API URL: `https://depuko-api-production.up.railway.app`
- Both API and PostgreSQL services were online at the time of inspection.
- No Storage Bucket was present.
- No staging environment was present.
- No staged Railway changes were present.

### API service variables observed

`API_PORT`, `CORS_ORIGINS`, `DATABASE_URL`, `EMAIL_PROVIDER_API_KEY`, `NODE_ENV`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `PORT`, plus Railway-provided runtime variables.

### PostgreSQL service variables observed

`DATABASE_URL`, `PGDATA`, `PGDATABASE`, `PGHOST`, `PGPASSWORD`, `PGPORT`, `PGUSER`, `POSTGRES_DB`, `POSTGRES_PASSWORD`, `POSTGRES_USER`, plus Railway-provided runtime variables.

### Shared variables observed

- `EMAIL_PROVIDER_API_KEY`
- `OPEN_AI_KEY`

Railway redacted variable values from the connector response. Variable presence does not verify that a key is valid or that its provider account is active.

## Railway variables still required or requiring confirmation

### Present; do not duplicate

- `DATABASE_URL`
- `CORS_ORIGINS`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `EMAIL_PROVIDER_API_KEY`

The API adapter reads `OPENAI_API_KEY` (or legacy `AI_PROVIDER_API_KEY`), not the shared variable name `OPEN_AI_KEY`. The latter appears to be a legacy/mismatched name; do not delete it until any other service usage has been checked.

`CORS_ORIGINS` exists, but its value was redacted. Confirm that it contains the exact active browser origins, comma-separated and without trailing slashes. Current stable Vercel origins include:

- `https://depuko-platform-mainnn.vercel.app`
- `https://project-ivk8j.vercel.app`
- `https://depuko-admin.vercel.app`

Do not overwrite the existing list blindly; append only the origins that are actually used.

### Private file storage — absent

Create a private Railway Bucket first, then add these variables to the API service:

- `STORAGE_ENDPOINT`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_URL_STYLE=virtual-hosted`

Use Railway bucket references for `ENDPOINT`, `BUCKET`, `REGION`, `ACCESS_KEY_ID` and `SECRET_ACCESS_KEY`. The code defaults to virtual-hosted style; use `path` only if the bucket Credentials page explicitly requires path-style URLs.

The bucket must remain private. The API issues short-lived signed URLs; do not make the bucket public.

### Malware scanner — absent and not yet provisioned

- `FILE_SCANNER_ENDPOINT`
- `FILE_SCANNER_API_KEY`

The endpoint must implement the DEPUKO scanner contract: HTTPS POST with JSON `{ bucket, key, mimeType, sizeBytes }`, returning JSON `{ verdict: "clean" | "infected" }`. A provider API key alone is not enough unless its service implements this contract. Until the scanner is configured, uploaded files remain quarantined and cannot be downloaded.

### Email and SMS

- `EMAIL_PROVIDER_API_KEY` is present, but the current application does not yet have a verified transactional email adapter.
- `SMS_PROVIDER_API_KEY` is absent, and SMS delivery is not integrated.

Do not add more provider secrets until the provider and adapter are selected and tested.

### Payments and payouts — keep disabled

- `PAYMENT_PROVIDER_SECRET` is intentionally absent.
- `PAYOUT_PROVIDER_SECRET` is intentionally absent.

The database settlement path now supports atomic persistence/deduplication/ledger posting, but the webhook signature implementation is still generic HMAC rather than a provider-certified raw-body signature integration. PSP sandbox, refund execution and payout execution are not accepted end-to-end. **Real-money collection and payouts must remain OFF.**

### Other build-time variables

- `NEXT_PUBLIC_API_BASE_URL` belongs in Vercel, not Railway. It is configured in the active Vercel projects, including the previously missing `project-ivk8j`.
- `EXPO_PUBLIC_API_BASE_URL` belongs in the Expo/EAS build environment, not Railway. Worker Mobile currently has a production API fallback.

## Remaining release gates

1. Run the next CI against the lockfile commit using frozen installation.
2. Create a separate Railway staging environment with a separate PostgreSQL database before deploying the release branch API.
3. Verify migrations against staging and run authenticated HTTP E2E, tenant-isolation and browser tests.
4. Verify the OpenAI key/model with a successful live chat request; the current production API previously returned HTTP 503 for an AI request.
5. Create the private bucket and test signed upload, completion, quarantine, scanner verdict and signed download.
6. Implement and verify transactional email/SMS provider adapters.
7. Select a PSP and implement its exact signature verification, sandbox capture, refund, reconciliation and payout flows.
8. Complete jurisdiction-reviewed payroll rules and operational/legal sign-off.
9. Only then consider merging PR #2 and promoting the new API/web deployments.

**Release decision: not production-certified yet.** Green CI and Vercel previews are necessary, but they do not replace staging acceptance, provider verification, production database review or operational sign-off.
