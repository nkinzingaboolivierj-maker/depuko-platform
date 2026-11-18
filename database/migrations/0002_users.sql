-- 0002_users.sql
-- Backs the `users` module: real accounts with hashed passwords and roles,
-- replacing the placeholder identity assumed by 0001_init.sql's sessions table.

BEGIN;

CREATE TABLE users (
    id             TEXT PRIMARY KEY,
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    roles          TEXT[] NOT NULL DEFAULT '{customer}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

-- sessions.user_id is intentionally not a foreign key yet: the auth module
-- was built before the users module and issued sessions for arbitrary
-- user_id strings. Add the FK once every session-issuing path is confirmed
-- to only ever reference real users.id values.

COMMIT;
