# ai module

AI tool registry and orchestration boundary (§24-25). Every tool call is authorized, validated, rate-limited, and audited here — AI never gets direct DB access (§92) or business source-of-truth status (§93).

**Status:** not yet implemented (Phase per §98 TBD). Follow the
presentation/application/domain/infrastructure/tests layering used by
`auth` and `services` when building this out. Before writing code, run
through the New Feature Protocol (§94) and, if this module needs to represent
something the Universal Service Engine could instead configure, the New
Service Protocol (§95).
