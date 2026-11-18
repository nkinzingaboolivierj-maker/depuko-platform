# Database

PostgreSQL 18 (§48). Access is via the raw `pg` driver, not an ORM — see
ADR-008 in `docs/architecture/phase-0-decisions.md`. Migrations are
hand-written SQL, applied in order.

- `migrations/` — schema migrations, one direction only in production (§48).
  `0001_init.sql` covers the `auth` and `services` modules implemented so far.
- `seeds/` — local/dev seed data only, never run against production
- `scripts/` — one-off operational scripts (must be reviewed like any other code)

No migration runner is wired up yet — for local dev, apply migrations by hand
against the `docker-compose.yml` Postgres instance:

```bash
docker compose up -d postgres
psql "$DATABASE_URL" -f database/migrations/0001_init.sql
```

A real migration runner (e.g. `node-pg-migrate`, or a small custom tracker
table) should replace this manual step before Phase 3 is considered done.
