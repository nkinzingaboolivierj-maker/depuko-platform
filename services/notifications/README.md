# notifications service

In-app, push, email, SMS fan-out with priority, grouping, quiet hours, fallback, delivery tracking (§45).

Not yet implemented. Per §8, this runs as a separate process from the core
modular monolith because it is independently scaling / specialized workload —
keep domain logic here thin and call back into `apps/api` domain services for
business rules rather than duplicating them (§4: no duplicated business logic).
