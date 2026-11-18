# @depuko/api

NestJS modular monolith (§8). Every module under `src/modules/` follows the
same layering:

```
presentation/    controllers — thin, no business logic (§10)
application/     use cases / orchestration
domain/          entities, value objects, invariants
infrastructure/  repositories, external adapters
tests/
```

`auth`, `users`, `security`, and `services` are implemented as concrete examples of this pattern — together they form a real, tested login → authorize → publish flow.
Every other module is a stub `README.md` naming its responsibility and the
spec sections it must satisfy — build it out following the same shape when its
phase in §98 comes up. Do not add business logic to controllers, and do not
let the AI module (`ai/`) touch the database or another module's domain layer
directly (§25, §92) — it must go through the same application-layer use cases
everything else does.
