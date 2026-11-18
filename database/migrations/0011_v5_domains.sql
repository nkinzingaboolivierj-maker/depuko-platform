-- 0011_v5_domains.sql - customers, workforce, communication, scheduling,
-- inventory, assets (V5 domains). Additive only.
BEGIN;
CREATE TABLE customer_profiles (
    user_id             TEXT PRIMARY KEY REFERENCES users (id),
    display_name        TEXT NOT NULL,
    country             TEXT NOT NULL CHECK (char_length(country) = 2),
    preferred_language  TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','rw','fr')),
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','verified')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE worker_profiles (
    user_id             TEXT PRIMARY KEY REFERENCES users (id),
    headline            TEXT NOT NULL,
    country             TEXT NOT NULL,
    skills              TEXT[] NOT NULL DEFAULT '{}',
    verification_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN ('pending','under_review','verified','rejected')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_worker_skills ON worker_profiles USING GIN (skills);
CREATE INDEX idx_worker_verified ON worker_profiles (verification_status);
CREATE TABLE conversations (
    id           TEXT PRIMARY KEY,
    scope        TEXT NOT NULL CHECK (scope IN ('customer_worker','project_team','support')),
    participants TEXT[] NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_participants ON conversations USING GIN (participants);
CREATE TABLE messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    from_user       TEXT NOT NULL REFERENCES users (id),
    text            TEXT NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON messages (conversation_id, sent_at);
CREATE TABLE assignments (
    id                         TEXT PRIMARY KEY,
    order_id                   TEXT NOT NULL REFERENCES orders (id),
    worker_user_id             TEXT NOT NULL REFERENCES users (id),
    status                     TEXT NOT NULL DEFAULT 'offered'
                                 CHECK (status IN ('offered','accepted','checked_in','checked_out','declined')),
    scheduled_start            TIMESTAMPTZ NOT NULL,
    agreed_duration_minutes    INTEGER NOT NULL CHECK (agreed_duration_minutes > 0),
    approved_extension_minutes INTEGER NOT NULL DEFAULT 0,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assignments_worker ON assignments (worker_user_id);
CREATE INDEX idx_assignments_order  ON assignments (order_id);
CREATE TABLE stock_items (
    id                TEXT PRIMARY KEY,
    organization_id   TEXT NOT NULL REFERENCES organizations (id),
    name              TEXT NOT NULL,
    quantity_total    INTEGER NOT NULL CHECK (quantity_total >= 0),
    quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved <= quantity_total),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_items_org ON stock_items (organization_id);
CREATE TABLE assets (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations (id),
    kind            TEXT NOT NULL CHECK (kind IN ('equipment','vehicle','room','tool')),
    label           TEXT NOT NULL,
    condition       TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('good','needs_service','retired')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE asset_reservations (
    id          TEXT PRIMARY KEY,
    asset_id    TEXT NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
    reserved_by TEXT NOT NULL REFERENCES users (id),
    window      TSTZRANGE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    EXCLUDE USING gist (asset_id WITH =, window WITH &&)
);
COMMIT;