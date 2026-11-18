-- 0006_business_onboarding.sql - organizations + onboarding (S15/S16/S49)
BEGIN;
CREATE TABLE organizations (
    id            TEXT PRIMARY KEY,
    business_type TEXT NOT NULL,
    legal_name    TEXT NOT NULL,
    country       TEXT NOT NULL,
    industry      TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'registered'
                    CHECK (status IN ('registered','onboarding_in_progress','under_verification','rejected','activated')),
    capabilities  TEXT[] NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE organization_members (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users (id),
    role            TEXT NOT NULL CHECK (role IN ('owner','admin','finance','manager','staff')),
    UNIQUE (organization_id, user_id)
);
CREATE INDEX idx_org_members_user ON organization_members (user_id);
CREATE TABLE organization_branches (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    region          TEXT NOT NULL,
    UNIQUE (organization_id, name)
);
CREATE TABLE business_onboarding_sessions (
    id                 TEXT PRIMARY KEY,
    organization_id    TEXT NOT NULL UNIQUE REFERENCES organizations (id) ON DELETE CASCADE,
    template_id        TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'registered'
                         CHECK (status IN ('registered','onboarding_in_progress','under_verification','rejected','activated')),
    answers            JSONB NOT NULL DEFAULT '{}',
    ai_suggestions     JSONB NOT NULL DEFAULT '[]',
    rejection_reasons  TEXT[] NOT NULL DEFAULT '{}',
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE business_onboarding_documents (
    id                    TEXT PRIMARY KEY,
    onboarding_session_id TEXT NOT NULL REFERENCES business_onboarding_sessions (id) ON DELETE CASCADE,
    document_type         TEXT NOT NULL,
    status                TEXT NOT NULL DEFAULT 'submitted'
                            CHECK (status IN ('submitted','approved','rejected')),
    verifier_notes        TEXT,
    submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_onboarding_docs_session ON business_onboarding_documents (onboarding_session_id);
ALTER TABLE orders ADD COLUMN organization_id TEXT REFERENCES organizations (id);
CREATE INDEX idx_orders_org ON orders (organization_id);
COMMIT;