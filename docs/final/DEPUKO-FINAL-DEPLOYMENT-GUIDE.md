# DEPUKO V8 Repair Candidate — Deployment Guide

## Important release gate

This repository is a repair candidate, not a production-certified release. Do not deploy to public production or enable real money until the API/web apps build, tests pass, migrations are verified, security is reviewed and staging smoke tests succeed.

## 1. Prepare a clean machine

Install Node.js 20+, Corepack/pnpm 9, PostgreSQL 15+ and `psql`. Docker Desktop is optional for containerized staging. The repository currently has no `pnpm-lock.yaml`; create and review one before production release.

```powershell
corepack enable
corepack prepare pnpm@9.0.0 --activate
Copy-Item .env.example .env
pnpm install --no-frozen-lockfile
```

Never use the sample passwords in production. Keep secrets in the hosting platform's secret manager.

## 2. Create databases

Create separate disposable databases for:
- Fresh migration verification
- Upgrade migration verification
- HTTP E2E testing
- Staging

Do not run destructive migration experiments against production.

For a new empty database, apply migrations in numeric order:

```powershell
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/depuko_fresh"
Get-ChildItem .\database\migrations\*.sql | Sort-Object Name | ForEach-Object {
  Write-Host "Applying $($_.Name)"
  psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($_.Name)" }
}
```

The migration helper now tracks successfully applied scripts in `depuko_schema_migrations`. For an upgraded database without that table, inspect its schema first and use `-UpgradedThrough N` only after you have confirmed the previous migration level. The helper checks a sentinel but does not replace a full DBA schema review.

## 3. Verify before building containers

From repository root:

```powershell
Set-Location .\apps\api
npx tsc --noEmit
npx jest --testPathIgnorePatterns=http-e2e
```

Then run database-backed HTTP E2E, Playwright and all application builds as shown in `DEPUKO-FINAL-TEST-REPORT.md`. Resolve every failure before continuing.

## 4. GitHub

Create a private repository first. Then:

```powershell
Set-Location <path-to-DEPUKO-repository>
git init
git add .
git commit -m "DEPUKO V8 repair candidate"
git branch -M main
git remote add origin https://github.com/<YOUR-ACCOUNT>/<YOUR-REPOSITORY>.git
git push -u origin main
```

Do not commit `.env`, passwords, API keys, signing secrets, provider certificates, or production database URLs. Enable branch protection and require CI checks after CI has been observed passing on the repository.

## 5. Staging deployment (Docker Compose)

Set these in the host environment/secret manager:

- `DEPUKO_DB_PASSWORD`
- `PAYMENT_PROVIDER_SECRET` (keep empty until the PSP sandbox is configured)
- `PAYOUT_PROVIDER_SECRET` (keep empty until payout rails are implemented/approved)
- `AI_PROVIDER_API_KEY` (optional)

Prepare TLS certificates for the nginx mount path before opening ports 80/443. The current Compose configuration does not obtain certificates automatically.

```powershell
docker compose -f docker-compose.staging.yml up -d --build
```

Apply migrations using a secure PostgreSQL connection and `psql` as shown above. The API Dockerfile installs dependencies without a lockfile because none is included yet; this is not a reproducible production build until a lockfile is generated and reviewed.

## 6. Smoke tests

At minimum, verify:

1. `GET /api/v1/health` returns healthy.
2. Customer registration/login returns a session token; roles cannot be self-assigned at registration.
3. Customer can only see their own orders, quotes, contracts and payment intents.
4. Business organization membership scopes orders, services, branches, staff and finance routes.
5. Worker profile, opportunities and assignments are scoped to the authenticated worker.
6. Admin-only verification, dispute and trust operations reject non-admin users and record rationale/audit events.
7. Payment webhook returns unavailable when the provider secret is absent; signed sandbox events are verified before settlement.
8. Reviews are rejected unless customer-owned work is completed and the target was the assigned worker.
9. File uploads remain quarantined without a configured scanner.
10. Payroll stays unavailable without reviewed country-specific rules.

These are required checks, not completed results.

## 7. Controlled launch gates

Before real-money operations:

- PSP sandbox is approved and signed webhook verification passes.
- Refund request, approval, provider execution, webhook confirmation and ledger reconciliation are tested.
- Payout approval and execution are implemented and verified.
- Payroll rules are reviewed for each operating jurisdiction by a named reviewer.
- Private object storage and malware/content scanner are configured and tested.
- Email/SMS/AI providers have correct keys, rate limits and failure handling.
- PostgreSQL backups/PITR are enabled and a restore drill succeeds.
- Security review and operations/legal sign-off are documented.

Until then, keep the system in staging and keep real money disabled.
