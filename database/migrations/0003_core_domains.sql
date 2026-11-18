-- 0003_core_domains.sql - orders (additive only; FKs to real baseline tables)
BEGIN;
CREATE TABLE orders (
    id                     TEXT PRIMARY KEY,
    customer_id            TEXT NOT NULL REFERENCES users (id),
    service_definition_id  TEXT NOT NULL REFERENCES service_definitions (id),
    service_version_id     TEXT NOT NULL REFERENCES service_versions (id),
    status                 TEXT NOT NULL DEFAULT 'pending_payment'
                               CHECK (status IN ('pending_payment','confirmed','in_progress','completed','cancelled')),
    price_amount_cents     BIGINT NOT NULL CHECK (price_amount_cents > 0),
    price_currency         TEXT NOT NULL DEFAULT 'RWF',
    idempotency_key        TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (idempotency_key)
);
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_status   ON orders (status);
COMMIT;