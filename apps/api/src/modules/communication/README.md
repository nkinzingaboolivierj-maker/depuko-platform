# Communication module

Scoped conversations are implemented with participant checks:

- Customer/worker conversations require an order assignment relationship.
- Project-team conversations require every participant to be a member of the same organization.
- Support conversations require exactly one administrator and one requester.
- Conversation and message reads/writes are participant-scoped in the repository.

Production acceptance still requires HTTP E2E tests for each scope and tenant-isolation cases.