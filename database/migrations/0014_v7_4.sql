-- 0014_v7_4.sql - read paths for the V7.4 screens. Additive only.
BEGIN;

-- Worker-visible payout view: only their own payouts, never others'.
-- Base payouts table exists from 0005.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'depuko_app') THEN
    GRANT SELECT ON payouts TO depuko_app;
  ELSE
    RAISE NOTICE 'depuko_app role not found; grant SELECT on payouts to the runtime database role before launch';
  END IF;
END $$;

-- notifications: in-app persisted notifications for authenticated users.
CREATE TABLE notifications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users (id),
    channel     TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email','sms','push')),
    text        TEXT NOT NULL,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);

-- org-scoped service catalog for the business workspace.
CREATE TABLE organization_services (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations (id),
    name            TEXT NOT NULL,
    price_cents     BIGINT NOT NULL CHECK (price_cents > 0),
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published','retired')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_services_org ON organization_services (organization_id);

COMMIT;