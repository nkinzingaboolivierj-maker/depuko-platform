-- 0015_quotes.sql - quote lifecycle, scoped to customer and issuing organization.
BEGIN;
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  customer_id TEXT NOT NULL REFERENCES users(id),
  total_cents BIGINT NOT NULL CHECK (total_cents > 0),
  currency TEXT NOT NULL DEFAULT 'RWF',
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quotes_customer ON quotes(customer_id, created_at DESC);
CREATE INDEX idx_quotes_org ON quotes(organization_id, created_at DESC);
CREATE INDEX idx_quotes_order ON quotes(order_id);
COMMIT;
