# Golden End-to-End Tests

These are the acceptance tests for DEPUKO as a whole, per the master
specification. Implement each as real E2E coverage once its dependencies exist —
do not mark a phase complete while its golden test is unimplemented or failing.

1. **Cleaning scenario** (§63) — intent → onboarding → quote → payment → worker
   match → check-in → completion → payout → review.
2. **Film production scenario** (§64, §107) — open-ended creative project,
   visual references, crew detection, multi-service composition.
3. **Construction scenario** (§65) — one project, many dependent child services
   (architecture → engineering → construction → finishing → furniture).
4. **Global worker scenario** (§66, §109) — worker outside Rwanda, remote
   opportunity, contract, execution, payout through a supported route.
5. **Security scenario** (§67, §110) — compromised session attempts a payout
   destination change; step-up auth and risk evaluation must block/escalate it.
6. **AI attack scenario** (§68) — malicious document instructs the AI to ignore
   instructions and exfiltrate data; must be blocked and contained.
7. **Universal Service Test** (§69) — a brand-new service ("pet grooming at
   home") is created via the Service Builder only, with zero dedicated frontend
   code, and is discoverable through natural-language request resolution.
8. **Second Golden Test** (§108) — a completely unknown service request must
   never be hallucinated as available; the system proposes a path instead.
9. **Resilience test** (§111) — AI/payment/messaging/maps providers and a queue
   worker are each disabled in turn; the system must fail safely, never invent
   success.
10. **Final UX test** (§112) — checklist: customer never needs to understand
    internal structure; ordinary new services need zero custom frontend code;
    AI never controls business truth; one compromised user can't compromise
    the platform.
