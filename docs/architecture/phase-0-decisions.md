# DEPUKO — Phase 0 Decisions Log

Architecture Decision Record, per Master Specification §103 (Cloud Decision Log) and §104 (best-effort ambiguity resolution).

**Status legend**
- `DEFAULT` — reversible, low-risk assumption made per §104. Documented so the build proceeds; revisit anytime.
- `OPEN` — touches money, security, or legal/compliance per §104. Not invented. Requires a decision from DINORT GROUP before the relevant phase starts.

---

## ADR-001 — Repository State
**Status:** DEFAULT (resolved) — treated as greenfield

No existing DEPUKO repository has been provided or referenced, so Phase 1 proceeds directly from the §9 target structure rather than the §5 inspect/classify workflow. `current-state.md`, `gaps.md`, and `migration-plan.md` are not produced, since there is no existing system to audit.

**Rationale:** Reversible — if an existing codebase surfaces later, run the §5 inspection against it and reconcile it with this scaffold using the same KEEP/REFACTOR/REPLACE/REMOVE/MIGRATE classification.

---

## ADR-002 — Initial Jurisdiction
**Status:** DEFAULT — Rwanda

DINORT GROUP is Kigali-based, so Rwanda is the sensible first concrete jurisdiction: one real tax/compliance adapter, one real work-authorization ruleset, one real payout rail — instead of leaving §35 and §78 permanently abstract.

**Rationale:** Reversible. The compliance-boundary architecture (§35) already requires this to be pluggable, so adding a second jurisdiction later is a new adapter, not a rewrite.

**Still OPEN within this:** the specific tax treatment of contractors vs. employees and mobile-money regulatory requirements need verification against current Rwandan law — an engineering agent should not infer these; a lawyer/accountant should supply them (see ADR-005).

---

## ADR-003 — AI Provider
**Status:** DEFAULT

"Provider-agnostic AI Gateway" (§7, §24) is the right abstraction, but it needs one concrete provider to implement against first. Recommend picking one mainstream LLM API behind the gateway interface at Phase 5, with the abstraction making a future swap or multi-provider setup straightforward.

**Rationale:** Reversible — the gateway pattern exists specifically so this choice isn't load-bearing.

---

## ADR-004 — Payment & Payout Rails
**Status:** OPEN

§34 requires local payout rails, bank, mobile money, and country-specific providers — but forbids inventing provider capabilities (§4) or false universal payment assumptions (§34).

For Rwanda, realistic candidates are MTN Mobile Money / Airtel Money for consumer/worker payouts, plus a regional aggregator (e.g. Flutterwave, Paystack) for card payments. This is a licensing- and settlement-bearing decision, not an engineering one.

**Needed:** DINORT GROUP (or whoever owns finance) selects the actual payout rail(s) and payment processor before Phase 9 (Contracts and Finance) begins. Until then, Phase 9 work should build the provider-abstraction layer and a sandbox/test-mode integration only, per §101.

---

## ADR-005 — Legal & Compliance Content Ownership
**Status:** OPEN

Contract templates (§42), cancellation/dispute terms, and payout eligibility rules (§41) carry real legal weight. §4 explicitly forbids inventing legal requirements. An engineering agent left to fill this gap will produce plausible-sounding boilerplate, which is worse than an empty stub.

**Needed:** A named human owner (lawyer/accountant/compliance advisor to DINORT GROUP) supplies contract clause content, payout eligibility rules, and jurisdiction-specific disclaimers. Engineering builds the workflow and data model around whatever content that owner provides.

---

## ADR-006 — Production-Readiness Verification Owner
**Status:** OPEN

§106's acceptance bar ("0 critical security issues," "0 cross-tenant issues," etc.) is only meaningful if something independent checks it. The automated BOLA/IDOR and security-test suite (§86) catches known patterns; the "0 critical issues" claim in §106 additionally wants a human pen test or external audit before DEPUKO is called production-ready.

**Needed:** Decide who signs off on §106 — internal security review, external pen-test firm, or both — before Phase 15 (Security Hardening) is considered complete.

---

## ADR-007 — Implementation Sequencing: Walking Skeleton First
**Status:** DEFAULT

§98's Phase 0–19 order is the target architecture sequence, explicitly not an MVP roadmap. Recommend that within Phases 4–9, the first concrete milestone is proving the Golden E2E Test #1 (cleaning scenario, §63) end-to-end — intent → onboarding → quote → payment → worker match → completion → payout — using **one** real service, the Rwanda jurisdiction (ADR-002), and whatever payout rail is chosen (ADR-004), before breadth-building the rest of the Universal Service Engine, workforce marketplace, and admin surfaces.

**Rationale:** This is the smallest slice that exercises every architectural principle in the spec at once (Universal Service Engine, ledger, AI boundary, tenant isolation) and gives a concrete human checkpoint before Phases 7–13 expand scope. Reversible — it's a sequencing choice, not an architecture change.

---

## ADR-008 — Database Access: raw `pg` driver, no ORM
**Status:** DEFAULT (resolved)

The `auth` and `services` modules are wired to Postgres 18 via the raw `pg`
driver and hand-written SQL migrations (`database/migrations/0001_init.sql`),
not an ORM (Prisma, TypeORM, etc.).

**Rationale:** Reversible in principle, but deliberately chosen over an ORM
for two reasons: (1) financial-adjacent modules (`finance`, `payments`,
`payroll`) benefit from SQL that's auditable line-by-line rather than
generated, which matters for the ledger integrity requirements in §39; (2) it
avoids an ORM-codegen step that needs network access to a binary CDN outside
this environment's allowed domains, which would otherwise block verifying the
scaffold actually compiles. Repositories map database rows to domain entities
explicitly (see `ServiceVersion.restore()` / `Session.restore()`), keeping
persistence concerns out of the domain layer regardless of driver choice.

---

## Summary: Decisions blocking downstream phases

| ADR | Blocks | Needs |
|---|---|---|
| 004 | Phase 9 (live mode) | DINORT GROUP: payout rail + payment processor selection |
| 005 | Phase 9, Phase 42 (contracts) | Named legal/compliance content owner |
| 006 | Phase 15 completion, §106 sign-off | Named verification owner (internal or external) |

Everything else in this log (001, 002, 003, 007, 008) is a documented default
per §104 and does not block starting work.
