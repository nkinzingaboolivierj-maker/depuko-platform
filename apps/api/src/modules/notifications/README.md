# notifications module

Notification domain rules: priority, grouping, quiet hours, fallback (§45). Delivery fan-out itself lives in services/notifications.

**Status:** not yet implemented (Phase per §98 TBD). Follow the
presentation/application/domain/infrastructure/tests layering used by
`auth` and `services` when building this out. Before writing code, run
through the New Feature Protocol (§94) and, if this module needs to represent
something the Universal Service Engine could instead configure, the New
Service Protocol (§95).
