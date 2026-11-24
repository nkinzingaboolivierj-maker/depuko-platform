# DEPUKO — Release Gap Comparison (2026-11-19)

This is an evidence-based comparison of the product scope requested for DEPUKO against the repository state inspected on 2026-11-19. Present in source does not mean verified end-to-end. Build status is reported separately from functional acceptance.

## Executive status
- Railway API: live deployment SUCCESS; one replica online.
- Railway PostgreSQL: online; one replica online.
- Customer web preview for the synchronized navy refresh branch: Vercel READY; Next.js production build completed and type validation passed.
- Admin web preview for the same branch: still BUILDING / no terminal result observed at the time of this report.
- GitHub release PR #2: open, not merged. Main remains unchanged by the navy UI delta.
- Production web aliases still point to main, not the preview branch.
- AI endpoint: a real POST was recorded as HTTP 503 before the latest API deployment; the controller masks provider errors. A successful live OpenAI response has not been verified.
- Real payments: disabled / NO-GO. Do not configure PSP secrets.

## Product scope versus implementation

| Product requirement | Source evidence / current state | Acceptance status |
|---|---|---|
| Navy + white design matching approved reference | Customer and Admin navy refresh CSS/pages exist in release branch; compact navigation and some collapse controls included | Customer build passes; visual/browser acceptance still needed |
| Avoid oversized cards; compact information density | Some refreshed pages use compact layouts; not every route was redesigned | Partial |
| Collapsible sidebar / hidden navigation | Admin sidebar collapse control exists; no evidence every customer/business/worker portal navigation has consistent collapse behavior | Partial |
| Light/dark theme | Customer ThemeProvider persists theme; admin does not have equivalent theme provider in current source | Partial |
| Responsive mobile UI | CSS and worker mobile edits exist; no Playwright/device test or Expo build evidence | Not verified |
| Customer first login | Customer email/password registration/login creates an opaque session | Partial: no unified role discovery/routing or protected-route acceptance |
| Business first login | Authenticated organization creation and /organizations/mine API exist; business page currently asks for manual organization ID | Not complete |
| Worker first login | Worker web page has its own login and assignment list/actions | Partial: no central role router; mobile build unverified |
| Admin first login | Admin command center still asks for a manually supplied session token; no verified admin login UI/role bootstrap | Not complete |
| Portal privacy / role isolation | Backend AuthGuard, permissions and organization membership checks exist in source | Not runtime/security-tested end-to-end |
| Customer orders, quotes, contracts, projects, disputes, payments, reviews, notifications | Routes/pages and backend modules exist in source | Partial; full customer journey not E2E tested |
| Business services, branches, staff, orders, availability, projects, support, finance | Multiple backend endpoints and pages exist; business landing still manual organization ID | Partial; missing/unfinished workflows and no E2E acceptance |
| Worker assignments, opportunities, applications, earnings, training, safety, profile, support | Several API routes/mobile navigation exist; worker web currently only handles basic assignment actions | Partial |
| Admin command center / operations | Finance integrity, integration health, analytics, workforce verification, disputes/trust paths exist in source | Partial; login bootstrap and broad platform-management UI missing |
| AI assistant | /api/v1/ai/chat uses OpenAI Responses API; server-side key/model variables exist | Not accepted: observed 503, no successful response test |
| Email notifications | Environment placeholder documented; no complete transactional provider integration verified | Not integrated |
| SMS notifications | Environment placeholder documented; no complete provider integration verified | Not integrated |
| Private uploads + malware scanning | Storage/scanner variables documented only | Not integrated; keep uploads quarantined |
| Payments and refunds | Webhook currently posts ledger entries but does not persist captured payment or transition payment intent; dedup marker can be committed before ledger post | Critical blocker; real money OFF |
| Worker payouts | Payout provider secret is only a placeholder; no approved execution path | Not ready |
| Payroll | Explicitly unavailable pending reviewed country-specific rules | Not ready |
| Service simulation and publication | Publication fails closed until a real simulation suite exists | Not ready |
| PostgreSQL migration validation | Migrations 0001–0016 exist in source; fresh/upgrade DB verification not run | Not verified |
| Automated quality gates | Customer Vercel preview build passed. Admin build pending. Full Jest/API E2E/Playwright/Expo/Docker/DB test suite not run | Not complete |
| Dependency security | Customer preview install reported 51 npm audit vulnerabilities: 12 low, 22 moderate, 16 high, 1 critical | Security remediation required; do not blindly force-upgrade |
| Reproducible installs | No reviewed pnpm lockfile is present; Vercel warned lockfile missing SWC dependencies | Not complete |

## Exact Railway API environment currently present
Names observed on the production API service:
- API_PORT
- CORS_ORIGINS
- DATABASE_URL
- NODE_ENV
- OPENAI_API_KEY
- OPENAI_MODEL
- PORT
- Railway-provided runtime variables

The actual secret values were not exposed in this report. Do not recreate or replace the existing OpenAI key merely because a request returned 503. Verify the OpenAI key project permissions, billing/usage, and provider error using safe server-side logs.

## Web environment variables
Both Customer and Admin Vercel projects have NEXT_PUBLIC_API_BASE_URL set to:
https://depuko-api-production.up.railway.app/api/v1

## Remaining owner/provider setup
- EMAIL_PROVIDER_API_KEY — transactional email provider
- SMS_PROVIDER_API_KEY — SMS provider
- STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY — private object storage
- FILE_SCANNER_ENDPOINT, FILE_SCANNER_API_KEY — malware/content scanner
- PAYMENT_PROVIDER_SECRET, PAYOUT_PROVIDER_SECRET — do not set until settlement/payout code passes a PSP sandbox and finance review

## Release gate order
1. Finish and verify first-login identity/role discovery and private portal routing for Customer, Business, Worker and Admin.
2. Complete the remaining business and worker workflows; complete Admin login/authorization UX.
3. Fix AI provider diagnostics, run a real chat request and verify the assistant returns a non-empty response.
4. Complete payment intent capture persistence, transactional idempotency, refunds and PSP-specific signature verification in sandbox.
5. Integrate transactional email, SMS, private storage and malware scanning; keep upload quarantine on failure.
6. Generate and commit a reviewed lockfile; remediate critical/high dependency findings safely.
7. Run API typecheck/Jest, DB fresh+upgrade migrations, authorization/tenant-isolation E2E, Playwright, Expo build and Docker staging.
8. Verify backups/restore, monitoring, legal/compliance and human operational sign-off.
9. Merge the release PR only after the gates pass; then promote production deployments and verify public aliases.

**Release decision: NOT READY FOR PRODUCTION.** A green Vercel build is not proof that all user journeys, payments, AI, notifications, storage, security or mobile workflows work.