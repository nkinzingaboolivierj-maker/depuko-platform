-- 0013_contracts.sql - versioned contracts (S35). Additive only.
BEGIN;

CREATE TABLE contracts (
    id         TEXT PRIMARY KEY,
    version    INTEGER NOT NULL CHECK (version >= 1),
    terms      JSONB NOT NULL DEFAULT '{}',
    party_ids  TEXT[] NOT NULL CHECK (array_length(party_ids, 1) >= 2),
    status     TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','sent','signed','superseded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contract_signatures (
    id          TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL REFERENCES contracts (id) ON DELETE CASCADE,
    party_id    TEXT NOT NULL,
    signed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (contract_id, party_id)
);

COMMIT;