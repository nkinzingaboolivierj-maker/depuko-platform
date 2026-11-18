# DEPUKO V8 Repair Candidate — File Manifest

This manifest summarizes the repository layout. The authoritative complete list of files and their exact sizes is `DEPUKO-FINAL-FILE-MANIFEST.txt` at the root of the release archive.

## Major areas

- `apps/api/src/modules/` — NestJS modular backend
- `apps/customer-web/` — customer and business web screens
- `apps/admin-web/` — administration web screens
- `apps/worker-mobile/` — Expo worker screens and navigation
- `database/migrations/0001_*.sql` through `0016_*.sql` — database migrations
- `tools/migrations/check.ps1` and `check.sh` — migration verification helpers
- `.github/workflows/ci.yml` — GitHub Actions workflow (not executed in this environment)
- `docker-compose.staging.yml`, `apps/api/Dockerfile`, `infrastructure/nginx/` — staging/container configuration
- `docs/final/` — implementation audit, test report, deployment guide and release notes

## Exclusions

- No real credentials or private environment files are included.
- No `node_modules`, build caches or `.git` directory are included.
- Original builders and the baseline archive are not included in the release repository; their source integrity and the builder-chain failure are documented in the audit report.
