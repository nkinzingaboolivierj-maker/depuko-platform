-- 0005_payments_payouts.sql - payment intents, webhook events, payouts
BEGIN;
CREATE TABLE payment_intents (
    id                  TEXT PRIMARY KEY,
    order_id            TEXT NOT NULL REFERENCES orders (id),
    amount_cents        BIGINT NOT NULL CHECK (amount_cents > 0),
    currency            TEXT NOT NULL DEFAULT 'RWF',
    status              TEXT NOT NULL DEFAULT 'created'
                            CHECK (status IN ('created','pending','authorized','settled','failed','cancelled','refunded','partially_refunded','disputed','reversed')),
    provider            TEXT NOT NULL,
    provider_reference  TEXT UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_intents_order ON payment_intents (order_id);
CREATE TABLE processed_webhook_events (
    event_id    TEXT PRIMARY KEY,
    provider    TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE payouts (
    id                 TEXT PRIMARY KEY,
    order_id           TEXT NOT NULL REFERENCES orders (id),
    worker_profile_id  TEXT,
    amount_cents       BIGINT NOT NULL CHECK (amount_cents > 0),
    currency           TEXT NOT NULL DEFAULT 'RWF',
    status             TEXT NOT NULL DEFAULT 'eligible'
                         CHECK (status IN ('eligible','approved','processing','paid','failed','rejected')),
    needs_approval     BOOLEAN NOT NULL DEFAULT TRUE,
    provider_reference TEXT UNIQUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payouts_status ON payouts (status);
COMMIT;