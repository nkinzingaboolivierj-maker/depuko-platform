-- 0008_audit.sql - immutable audit trail (S72)
BEGIN;
CREATE TABLE audit_events (
    id               TEXT PRIMARY KEY,
    actor_user_id    TEXT NOT NULL,
    action           TEXT NOT NULL,
    organization_id  TEXT,
    payload          JSONB NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_events_org    ON audit_events (organization_id);
CREATE INDEX idx_audit_events_action ON audit_events (action);
COMMIT;