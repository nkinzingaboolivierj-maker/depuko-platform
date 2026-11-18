-- 0009_payments_full.sql - payments, refunds, provider settlements (V5 fix #1)
BEGIN;
CREATE TABLE payments (
    id                TEXT PRIMARY KEY,
    payment_intent_id TEXT NOT NULL REFERENCES payment_intents (id),
    order_id          TEXT NOT NULL REFERENCES orders (id),
    amount_cents      BIGINT NOT NULL CHECK (amount_cents > 0),
    currency          TEXT NOT NULL DEFAULT 'RWF',
    provider          TEXT NOT NULL,
    provider_reference TEXT UNIQUE,
    status            TEXT NOT NULL DEFAULT 'captured'
                        CHECK (status IN ('captured','settled','failed','refunded')),
    occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_intent ON payments (payment_intent_id);
CREATE INDEX idx_payments_order ON payments (order_id);
CREATE TABLE refunds (
    id                TEXT PRIMARY KEY,
    payment_intent_id TEXT NOT NULL REFERENCES payment_intents (id),
    payment_id        TEXT NOT NULL REFERENCES payments (id),
    amount_cents      BIGINT NOT NULL CHECK (amount_cents > 0),
    currency          TEXT NOT NULL DEFAULT 'RWF',
    status            TEXT NOT NULL DEFAULT 'requested'
                        CHECK (status IN ('requested','approved','rejected','processed','failed')),
    reason            TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refunds_intent ON refunds (payment_intent_id);
CREATE TABLE provider_settlements (
    id                 TEXT PRIMARY KEY,
    provider           TEXT NOT NULL,
    provider_reference TEXT NOT NULL,
    amount_cents       BIGINT NOT NULL,
    currency           TEXT NOT NULL DEFAULT 'RWF',
    settled_at         TIMESTAMPTZ NOT NULL,
    recorded_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_reference)
);
COMMIT;