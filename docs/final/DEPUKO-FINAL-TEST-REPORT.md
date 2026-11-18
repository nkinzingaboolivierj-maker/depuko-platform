# DEPUKO V8 Repair Candidate — Test Report

**Execution date:** 2026-11-17  
**Decision:** **NOT READY**

This report distinguishes static/source checks from tests that require project dependencies, PostgreSQL, Docker, external providers or a browser runtime.

## Checks actually performed in this environment

| Check | Result | Evidence / limitation |
|---|---|---|
| Uploaded source ZIP integrity | PASS | ZIP opened and CRC tested; SHA-256 matched `CD7182105A9D15CDB28FE6529C663C004E6CCCF59C44C53541F9DB2FA3AD5A96`. |
| Source archive entries | PASS | 7 expected entries present. |
| Relative TypeScript/JavaScript import resolution | PASS (static scanner) | 247 TS/TSX/JS/JSX source files scanned; 0 unresolved relative imports. This does not replace the TypeScript compiler or runtime module resolution. |
| Python builder syntax in supplied pack | FAIL | All six supplied builders had syntax defects during the earlier source audit. Original builder files are not repaired in this repository candidate; this candidate does not claim a clean builder-chain build. |
| V5 builder validation | FAIL | Isolated V5 attempt stopped at required-file validation with 13 missing source paths. Validation was not bypassed for release. |
| Candidate TypeScript compiler | BLOCKED / FAIL | Global `tsc --noEmit` was invoked after source repairs: 487 diagnostics (130 TS2307 missing packages, 17 TS2580 missing Node globals, 135 TS2582 missing Jest `describe`/`it`, 205 TS2304 missing Jest globals/identifiers). No other diagnostic categories remained. External dependencies were unavailable; `npm install` timed out. This is not a passing typecheck. |
| Jest unit/domain tests | NOT RUN | Dependencies not installed; no Jest runtime. |
| HTTP/API E2E | NOT RUN | PostgreSQL and full API test runtime unavailable. |
| PostgreSQL migrations 0001–0016 | NOT RUN | No `psql`/PostgreSQL server available in this environment. |
| Tenant isolation runtime tests | NOT RUN | Security test source exists; no executed evidence. |
| Playwright | NOT RUN | Browser dependencies and app runtime unavailable. |
| Expo/mobile build | NOT RUN | Expo dependencies/build runtime unavailable. |
| Docker image/staging | NOT RUN | Docker daemon unavailable. |
| Bash migration helper syntax | PASS (syntax only) | `bash -n tools/migrations/check.sh` passed; script was not executed against PostgreSQL. |
| Migration filename sequence | PASS (static check) | 16 files numbered 0001 through 0016 with no gaps. SQL was not parsed/executed by PostgreSQL. |
| Environment/secret-file scan | PASS (static scan) | `.env.example` contains placeholders only; no `.env`, `.pem` or `.key` files were included in the candidate tree. |
| PSP signed webhook sandbox | NOT CONFIGURED / NOT RUN | Provider credentials and sandbox account required. |
| Email/SMS/AI/file scanner/storage | NOT CONFIGURED / NOT RUN | Owner provider credentials and endpoint configuration required. |
| Payroll rules | BLOCKED BY DESIGN | No reviewed country-specific rule registry supplied. |

## Re-run on Windows PowerShell

From the repository root:

```powershell
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install --no-frozen-lockfile
```

API checks:

```powershell
Set-Location .\apps\api
npx tsc --noEmit
npx jest --testPathIgnorePatterns=http-e2e
```

Database migration verification:

```powershell
# FreshDb must be a disposable empty database.
# UpgradedDb must be a disposable copy of an existing DEPUKO database.
# If it does not yet have depuko_schema_migrations, specify the verified
# version it already contains; see the warning emitted by check.ps1.
..\..\tools\migrations\check.ps1 `
  -FreshDb "postgresql://user:password@localhost:5432/depuko_fresh" `
  -UpgradedDb "postgresql://user:password@localhost:5432/depuko_upgraded" `
  -UpgradedThrough 14
```

HTTP E2E (use a separate disposable test DB after migrations):

```powershell
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/depuko_test"
npx jest tests/http-e2e.spec.ts
```

Browser tests:

```powershell
Set-Location ..\..
npx playwright install
npx playwright test
```

The `-UpgradedThrough` value is an operator assertion about a pre-existing disposable schema. Verify the actual schema version first; the migration script checks a sentinel table/trigger but that is not a complete database audit.

## Go / No-Go

- **Source candidate can be inspected:** YES.
- **Technical deployment ready:** NO.
- **Staging verified:** NO.
- **Controlled launch ready:** NO.
- **Real money:** OFF.

Do not change these statuses until the corresponding commands have been executed successfully and their output captured.


## Critical payment note discovered during final review

A source review of `ProcessWebhookUseCase` found that a verified `settled` event posts ledger entries but does not persist the captured payment via `recordPayment` or transition/save the payment intent. The controller can return `settled` while the intent remains in its prior state and `payments` has no captured row. The refund request flow therefore cannot rely on this event path yet. The processed-event marker is recorded before ledger posting in a separate operation; a ledger failure after marker insertion can make a retry appear duplicate. The signature is a custom HMAC over selected event fields and has not been validated against a real PSP's signing protocol. These are release-blocking defects; keep real payments OFF.

A state-machine Jest test that incorrectly attempted a second illegal settlement was corrected in source, but Jest was not available to execute it. This source correction is not evidence of a passing test suite.
