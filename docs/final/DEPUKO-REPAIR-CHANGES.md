# DEPUKO repair changes and known caveats

## Security-sensitive repairs

- Registration now sends only normalized email and password to the registration use case; user-supplied `roles` are not forwarded.
- Worker verification requires an administrator permission and a human rationale of at least 10 characters; the action is recorded in the audit log.
- Organization inventory reserve/release/read actions check authenticated organization membership and a manager-grade role.
- Worker opportunity advancement checks organization-manager membership and loads a specific applicant's server-side application record. Application snapshots come from verified skill records.
- Payment intent status and refund request paths verify that the caller owns the referenced order. Refund amounts are checked against captured payment less existing non-rejected refund requests.
- Review submission checks that the authenticated customer owns the completed order and that the reviewed worker was assigned and checked out. Review hiding now persists moderation status.
- Webhook processing is awaited; however, the current webhook use case is NOT a complete payment settlement implementation. On a `settled` event it posts ledger entries but does not update `payment_intents.status` or call `PaymentsRepositoryPort.recordPayment`. The customer intent can therefore remain `created` while no captured row exists in `payments`; the refund-request endpoint will reject it as having no captured payment. The replay marker is also written before ledger posting in a separate operation, so a ledger failure after marker insertion can cause a retry to be treated as a duplicate. The custom HMAC format has not been validated against any real PSP's raw-body/signature protocol. Keep real payments disabled.
- Service publication no longer creates a fake `passed` simulation state; it remains blocked until the real simulation implementation exists.

## Data and transaction repairs

- Quote acceptance now performs SELECT FOR UPDATE and status/ownership updates in one database transaction.
- Stock reservations and releases lock the stock row and check quantities within a transaction.
- Migration 0014 grants payout reads only if the optional `depuko_app` role exists.
- Migration 0015 adds quotes; migration 0016 adds persistent payout holds.
- Migration helper scripts maintain a `depuko_schema_migrations` ledger and refuse to blindly replay an upgraded schema without an explicit version assertion.

## Caveats requiring additional work

- Some read and write paths still need stronger transaction boundaries and concurrency/idempotency review before production.
- Refund approval is not equivalent to PSP refund execution; a provider adapter, signed confirmation, retry policy and ledger reconciliation are still required. Payment webhook settlement must also be made atomic/idempotent across event recording, intent transition, captured-payment persistence and ledger posting before a PSP can be enabled.
- Payouts are read-only in the worker app; release/execution is not an end-to-end provider integration.
- Service simulation, onboarding document upload/scanning, training curriculum publishing, availability calendars, complete admin operations and all application journeys are not fully implemented or verified.
- This source tree came from an earlier diagnostic build probe that had bypassed the V5 required-file validation, then was repaired manually. It is not a certified fresh build from the six original builders.
