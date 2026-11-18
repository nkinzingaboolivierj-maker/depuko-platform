# DEPUKO V8 Repair Candidate — Implementation Audit

**Date:** 2026-11-17  
**Owner:** DINORT GROUP  
**Release decision:** **NO-GO / NOT READY FOR PRODUCTION**

## Source provenance

The uploaded `DEPUKO-SOURCE-PACK-FULL.zip` was accessible in the ChatGPT work environment and verified with SHA-256:

`CD7182105A9D15CDB28FE6529C663C004E6CCCF59C44C53541F9DB2FA3AD5A96`

It contained six builder scripts (V5–V7.4) and `DEPUKO-baseline.zip`. The source pack was not the separate `depuko-scaffold.zip` referenced in James's message. That separate archive was not supplied in this work environment and therefore was not compared or audited.

The uploaded builders had Python syntax defects. A V5 test build in an isolated working copy, after removing only the trailing syntax delimiter, stopped at its own required-file validation and reported 13 missing implementation files. An earlier diagnostic probe bypassed that validation to inspect downstream generated layers; the probe archive was not accepted as a valid release.

This V8 candidate was assembled from that probe project tree and amended with additional source fixes. It was **not** produced by a successful, unmodified V5→V7.4 build chain. The original source ZIP and original builder files were preserved separately and were not overwritten.

## Source-level repair work included

- Added the missing organization, onboarding, customer, workforce, communication, dispatch, scheduling, and contract domain components identified during the audit.
- Added five NestJS modules for organizations, onboarding, customers, workforce, and communication and wired them in the root application module.
- Added quotes controller/module and quote migration 0015.
- Added persistent payout-hold migration 0016.
- Added customer registration route and whitelisted email/password fields so an HTTP caller cannot self-assign elevated `roles` through the registration request.
- Added contracts listing and project-service listing read paths.
- Added worker payout-history read endpoint, worker profile/verification paths, and worker mobile screen navigation for profile, safety, opportunities, earnings, training, and support.
- Added business-scoped order commands and server-side organization membership checks.
- Corrected the worker opportunity advancement authority so a hiring organization manager, not the applicant, advances application stages; verified skills are fetched server-side for the application snapshot.
- Added completed-work eligibility checks for customer reviews and persisted review moderation rather than returning a fabricated moderation success.
- Added payment intent order-ownership checks, refund-request amount checks, and awaited webhook processing.
- Made inventory operations check organization-manager membership and added transactional reserve/release checks.
- Made service publication fail closed instead of recording a fabricated simulation pass.
- Corrected several PostgreSQL generic typings and the payout grant migration behavior when the optional `depuko_app` database role is absent.
- Updated migration verification scripts to record applied migrations and avoid blindly replaying the full history on an upgraded database.
- Updated Docker/CI install instructions to acknowledge that no `pnpm-lock.yaml` exists in the supplied project.

See `DEPUKO-REPAIR-CHANGES.md` for additional details and known caveats.

## Implementation matrix

| Area | Current status | Notes |
|---|---|---|
| API module graph | SOURCE-LEVEL PARTIALLY REPAIRED | Missing modules added; Nest dependency-injection boot not executed. |
| Customer application | PARTIAL | Auth, orders, quotes, contracts, payments, projects, disputes, reviews, and notifications paths exist; full customer request-to-completion journey not verified. |
| Business workspace | PARTIAL | Onboarding, services, branches, staff and business order paths exist; operational completeness, availability scheduling, finance and quote lifecycle need integration testing and further implementation. |
| Admin command center | PARTIAL | Finance/system/integration checks, workforce verification, disputes and trust paths exist; full platform management and audit UI not verified. |
| Worker mobile | PARTIAL | Login/navigation and profile, safety, opportunities, earnings, training, support screens are wired; assignments, training curriculum and production mobile build need verification. |
| PostgreSQL repositories | WRITTEN / NOT VERIFIED | No PostgreSQL runtime available here. |
| Migrations | WRITTEN 0001–0016 / NOT EXECUTED | Must be verified against fresh and upgraded databases. |
| Payment provider | NOT CONFIGURED / SETTLEMENT GAP | The webhook use case verifies its custom HMAC and posts ledger entries, but does not persist a captured `payments` row or transition the `payment_intents` record. Its processed-event marker is committed before ledger posting, creating a retry-loss risk if ledger posting fails. The signature format is not verified against a real PSP protocol. Real-money operations must remain disabled. |
| AI/email/SMS | NOT CONFIGURED | Provider credentials and integration tests remain owner actions. |
| File storage/scanner | NOT CONFIGURED | Do not release uploaded files as safe. |
| Payroll | UNAVAILABLE BY DESIGN | Requires reviewed country rules and named human reviewer. |
| Service simulation/publication | BLOCKED | Publication now fails closed until an actual simulation suite exists. |
| GitHub CI | CONFIGURATION UPDATED / NOT RUN | CI install is non-frozen because no lockfile is supplied. |
| Docker staging | CONFIGURATION UPDATED / NOT RUN | No Docker daemon or hosting environment available here. |

## Mandatory remaining engineering work

1. Generate and commit a reviewed `pnpm-lock.yaml`.
2. Complete all four application workflows and all backend integration contracts.
3. Implement the genuine service simulation suite before enabling service publication.
4. Complete document upload/scanner integration and business onboarding document flows.
5. Complete training curriculum management, assessments, and certification controls.
6. Review payment settlement/refund/payout flows with a real PSP sandbox; test financial idempotency and ledger consistency.
7. Verify business availability, staff invitations, quotes, scheduling, dispatch, projects, inventory, support and notifications end-to-end.
8. Complete PostgreSQL migration, restore, tenant isolation and authorization testing.
9. Complete CI, Docker staging, Playwright, and mobile build verification.
10. Complete legal/compliance, backup/PITR and operational sign-off before controlled launch.


## Critical payment settlement gap

The current source in `apps/api/src/modules/payments/application/process-webhook.use-case.ts` verifies a custom event signature and then posts a balanced ledger transaction. It does not call `PaymentsRepositoryPort.recordPayment` or `saveIntent`, so the payment intent is not transitioned and no captured payment row is recorded. The webhook controller can respond with `settled` while the persisted payment state remains unchanged. The refund request endpoint subsequently looks for a captured/settled row in `payments` and may reject the intent.

The processed-event marker is written before the ledger post and through a separate repository operation. If ledger posting fails after the marker is committed, the retry may be treated as a duplicate and never retry the ledger post. Settlement needs a transactionally designed, idempotent implementation before a PSP sandbox or real-money flow can be enabled. The custom HMAC scheme must also be implemented/verified against the actual provider's webhook specification and raw-body requirements.
