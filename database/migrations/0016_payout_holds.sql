-- 0016_payout_holds.sql - persistent dispute-related payout holds.
BEGIN;
CREATE TABLE payout_holds (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  payout_id TEXT NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  UNIQUE (dispute_id, payout_id),
  CHECK ((released_at IS NULL AND release_reason IS NULL) OR (released_at IS NOT NULL AND length(trim(release_reason)) > 0))
);
CREATE INDEX idx_payout_holds_active ON payout_holds(payout_id) WHERE released_at IS NULL;
COMMIT;
