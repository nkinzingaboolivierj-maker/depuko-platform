# DEPUKO V8 Repair Candidate — Release Notes

This candidate carries forward the V5–V7.4 generated project tree and applies source-level repair work based on the supplied audit findings.

## Included repair changes

- Missing domain/repository/controller/module source added for organizations, onboarding, customers, workforce and communication.
- Missing imports fixed; static relative-import scan reports zero unresolved relative imports.
- Quote endpoints and migration 0015 added.
- Payout hold persistence migration 0016 added.
- Customer registration whitelists credentials and prevents client role injection.
- Payment intent ownership and refund request checks strengthened; webhook processing is awaited. The webhook settlement flow still has a critical gap: it posts ledger entries without updating the payment intent or recording a captured payment, and event deduplication is not atomic with ledger posting. It is not safe for real PSP use.
- Customer review eligibility and review moderation persistence corrected.
- Worker opportunities use server-side verified skill snapshots; only an authorized hiring organization may advance a stage.
- Business orders and inventory actions include organization membership/role checks.
- Service publication now fails closed until a real simulation suite is available.
- Migration scripts track applied migrations rather than replaying all historical scripts blindly.
- Docker/CI install steps no longer assume a `pnpm-lock.yaml` that is absent from the supplied tree.

## Known incomplete work

- No full clean builder-chain build from the original baseline is certified.
- No complete runtime typecheck, Jest, HTTP E2E, PostgreSQL, Playwright, Expo build or Docker staging verification has passed here.
- Business availability calendar/dispatch and finance workflows need further end-to-end completion.
- Admin command center does not yet represent every platform management operation.
- Worker training content and full assessment/certification management are not implemented.
- Customer request intake still needs a complete create-request/quote lifecycle through all business types.
- Payment webhook settlement persistence/idempotency, real refund execution, payouts provider integration, service simulation, file scanner/storage, email/SMS/AI and payroll rules remain blocked/unconfigured.
- No GitHub repository or live deployment was created by this work.

**Release status: NOT READY FOR PRODUCTION.**
