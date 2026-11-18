-- 0004_finance.sql - double-entry ledger (S39)
BEGIN;
CREATE TABLE ledger_accounts (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL UNIQUE,
    account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','revenue','expense','equity')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE ledger_transactions (
    id          TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    reference   TEXT,
    posted_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE ledger_entries (
    id             TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES ledger_transactions (id),
    account_id     TEXT NOT NULL REFERENCES ledger_accounts (id),
    direction      TEXT NOT NULL CHECK (direction IN ('debit','credit')),
    amount_cents   BIGINT NOT NULL CHECK (amount_cents > 0),
    currency       TEXT NOT NULL DEFAULT 'RWF'
);
CREATE INDEX idx_ledger_entries_account     ON ledger_entries (account_id);
CREATE INDEX idx_ledger_entries_transaction ON ledger_entries (transaction_id);
CREATE VIEW v_ledger_balance_check AS
SELECT transaction_id,
       SUM(CASE WHEN direction = 'debit' THEN amount_cents ELSE -amount_cents END) AS net_cents
FROM ledger_entries GROUP BY transaction_id;
INSERT INTO ledger_accounts (id, name, account_type) VALUES
    ('acc_cash',     'Cash',            'asset'),
    ('acc_payable',  'Worker payable',  'liability'),
    ('acc_revenue',  'Service revenue', 'revenue');
COMMIT;