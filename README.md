# DEPUKO — DINORT GROUP

DEPUKO is a universal service marketplace and business operating system connecting customers, service businesses, workers, and platform administrators.

## Release status

**This archive is a V8 repair candidate — NOT READY FOR PRODUCTION.** It contains source-level repairs and additional API implementation, but the complete runtime verification has not been completed. Do not connect real payment credentials or expose this build to public customers until the release gates in `docs/final/DEPUKO-FINAL-TEST-REPORT.md` are passed.

The source pack supplied with this project had six Python builders with syntax defects. The V5 builder's validation also reported 13 missing required files. An earlier build probe bypassed that validation and produced a partial project tree. This candidate was assembled from that probe tree and repaired further; it is **not** proof that the original six-builder chain now builds cleanly from the baseline.

## Repository layout

- `apps/api` — NestJS API and PostgreSQL persistence
- `apps/customer-web` — customer and business web experience
- `apps/admin-web` — administrative web experience
- `apps/worker-mobile` — Expo worker application
- `database/migrations` — ordered SQL migrations (0001–0016)
- `tools/migrations` — migration verification scripts
- `infrastructure` — reverse proxy and deployment configuration
- `docs/final` — release status, test evidence, audit, and deployment instructions

## Local prerequisites

- Node.js 20 or newer
- Corepack + pnpm 9
- PostgreSQL 15 or newer
- `psql` command-line client
- Docker Compose for local/staging containers (optional)

The repository currently has **no `pnpm-lock.yaml`**. Install steps therefore resolve declared semver ranges and are not fully reproducible. Generate and commit a reviewed lockfile before treating builds as release-reproducible.

## Local setup (PowerShell)

```powershell
Copy-Item .env.example .env
# Edit .env and use strong local-only passwords.
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install --no-frozen-lockfile
```

Create a local PostgreSQL database and set `DATABASE_URL`. Apply the migrations to a fresh database:

```powershell
Get-ChildItem .\database\migrations\*.sql | Sort-Object Name | ForEach-Object {
  psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($_.Name)" }
}
```

Then run API verification:

```powershell
Set-Location .\apps\api
npx tsc --noEmit
npx jest --testPathIgnorePatterns=http-e2e
```

Run database-backed HTTP E2E separately after configuring a disposable test database:

```powershell
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/depuko_test"
npx jest tests/http-e2e.spec.ts
```

See `docs/final/DEPUKO-FINAL-DEPLOYMENT-GUIDE.md` for the staging workflow. These commands are instructions, not claims that the checks have passed in this environment.

## Important safety boundaries

- Payments remain disabled. In addition to missing provider configuration, the current webhook settlement path has a known persistence/idempotency defect: it posts ledger entries but does not save a captured payment or transition the payment intent, and the processed-event marker is not atomic with ledger posting. Do not enable a PSP until this is repaired and sandbox-tested.
- A refund request is not a refund execution; provider execution must be separately authorized and confirmed.
- Payroll remains unavailable until reviewed country-specific rules are registered by an identified human reviewer.
- File uploads must remain quarantined until a real scanner approves them.
- AI is not authorized to approve businesses, publish services, or alter financial records.
- Service publication is currently fail-closed because the full simulation suite is not implemented.

## Source and audit records

Read these files before deployment:

1. `docs/final/DEPUKO-FINAL-IMPLEMENTATION-AUDIT.md`
2. `docs/final/DEPUKO-FINAL-TEST-REPORT.md`
3. `docs/final/DEPUKO-FINAL-DEPLOYMENT-GUIDE.md`
4. `docs/final/DEPUKO-REPAIR-CHANGES.md`

Do not describe this candidate as production-ready until all mandatory checks show verified PASS evidence.
