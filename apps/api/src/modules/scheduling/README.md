# scheduling module

Resource scheduling: workers, equipment, vehicles, facilities, travel time, timezone, dependencies (§36). Prevents impossible collisions.

**Status:** not yet implemented (Phase per §98 TBD). Follow the
presentation/application/domain/infrastructure/tests layering used by
`auth` and `services` when building this out. Before writing code, run
through the New Feature Protocol (§94) and, if this module needs to represent
something the Universal Service Engine could instead configure, the New
Service Protocol (§95).
