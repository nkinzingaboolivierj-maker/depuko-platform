-- 0001_init.sql
-- Initial schema for the two modules implemented in this scaffold: auth and
-- services (Universal Service Engine). Every other module's tables get added
-- in their own numbered migration when that module is implemented — do not
-- grow this file into a god-migration (§90).

BEGIN;

CREATE TABLE sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    issued_at   TIMESTAMPTZ NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

CREATE TABLE service_definitions (
    id            TEXT PRIMARY KEY,
    domain        TEXT NOT NULL,
    category      TEXT NOT NULL,
    capabilities  TEXT[] NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GIN index so "find services by capability" (the §69 golden test) is an
-- index lookup, not a sequential scan, once real data volume exists.
CREATE INDEX idx_service_definitions_capabilities ON service_definitions USING GIN (capabilities);

CREATE TABLE service_versions (
    id                      TEXT PRIMARY KEY,
    service_definition_id   TEXT NOT NULL REFERENCES service_definitions (id) ON DELETE CASCADE,
    version_number          INTEGER NOT NULL,
    type                    TEXT NOT NULL,
    configuration           JSONB NOT NULL,
    simulation_status       TEXT NOT NULL DEFAULT 'not_run'
                                CHECK (simulation_status IN ('not_run', 'passed', 'failed')),
    published_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (service_definition_id, version_number)
);

CREATE INDEX idx_service_versions_definition_id ON service_versions (service_definition_id);

-- §16: published versions are immutable. Postgres can't enforce
-- "immutable after publish" as a CHECK constraint (it would need to compare
-- old vs new row), so this is enforced at the application layer
-- (ServiceVersion.publish() / .recordSimulation() in the domain entity) and
-- should additionally be enforced with a BEFORE UPDATE trigger before this
-- goes to production. Tracked as a known gap, not silently assumed safe.

COMMIT;
