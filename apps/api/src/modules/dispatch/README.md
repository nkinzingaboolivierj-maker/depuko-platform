# dispatch module

Physical job dispatch state machine: UNASSIGNED → ASSIGNED → EN_ROUTE → ARRIVED → IN_PROGRESS → BLOCKED → COMPLETED (§37).

**Status:** not yet implemented (Phase per §98 TBD). Follow the
presentation/application/domain/infrastructure/tests layering used by
`auth` and `services` when building this out. Before writing code, run
through the New Feature Protocol (§94) and, if this module needs to represent
something the Universal Service Engine could instead configure, the New
Service Protocol (§95).
