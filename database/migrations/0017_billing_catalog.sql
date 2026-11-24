-- Configurable registration fees and role-specific subscription plans.
-- Amounts are snapshots on obligations/subscriptions; the catalog can change
-- without rewriting a customer's historical price.
BEGIN;

CREATE TABLE billing_catalog_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('registration_fee','subscription')),
  audience TEXT NOT NULL CHECK (audience IN ('customer','worker','business')),
  plan_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency CHAR(3) NOT NULL DEFAULT 'RWF',
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('one_time','monthly','quarterly','yearly')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kind, audience, plan_key),
  CHECK ((kind = 'registration_fee' AND billing_interval = 'one_time') OR
         (kind = 'subscription' AND billing_interval <> 'one_time'))
);
CREATE INDEX idx_billing_catalog_active ON billing_catalog_items(kind, audience, active);

CREATE TABLE registration_fee_obligations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  organization_id TEXT REFERENCES organizations(id),
  audience TEXT NOT NULL CHECK (audience IN ('customer','worker','business')),
  catalog_item_id TEXT NOT NULL REFERENCES billing_catalog_items(id),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency CHAR(3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','waived','cancelled')),
  paid_at TIMESTAMPTZ,
  waiver_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, audience),
  CHECK ((status = 'waived' AND length(trim(COALESCE(waiver_reason,''))) >= 10) OR
         (status <> 'waived' AND waiver_reason IS NULL))
);
CREATE INDEX idx_registration_fees_user ON registration_fee_obligations(user_id, status);

CREATE TABLE billing_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  organization_id TEXT REFERENCES organizations(id),
  audience TEXT NOT NULL CHECK (audience IN ('customer','worker','business')),
  catalog_item_id TEXT NOT NULL REFERENCES billing_catalog_items(id),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency CHAR(3) NOT NULL,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly','quarterly','yearly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','past_due','cancelled','expired')),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_billing_one_open_subscription
  ON billing_subscriptions(user_id, audience)
  WHERE status IN ('pending','active','past_due');
CREATE INDEX idx_billing_subscriptions_user ON billing_subscriptions(user_id, status);

COMMIT;