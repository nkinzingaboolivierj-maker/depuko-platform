-- 0001_dev_admin.sql
-- LOCAL DEVELOPMENT ONLY. Never run against staging or production (§60, §100).
--
-- Seeds one admin account so the api-console.html demo (see /tools) and
-- manual testing can exercise the services:publish permission path without
-- a separate admin-promotion endpoint (which doesn't exist yet — the public
-- POST /users endpoint deliberately ignores any role in the request body,
-- so this is the only way to get an admin account right now).
--
-- Credentials: dev-admin@depuko.local / depuko-dev-admin
-- Password hash below was generated with this repo's actual PasswordHasher
-- (Node crypto.scrypt) — verified to round-trip before being committed here,
-- not a placeholder string.

INSERT INTO users (id, email, password_hash, roles)
VALUES (
  'user_dev_admin',
  'dev-admin@depuko.local',
  '637140cd4c30425a578e990c8ccc8475:9d77f40c82c4036aef06c56777f35c7d662b367101194b7fe3a37792fb7ad2a03bec8ce46a1b6efaf064f23c0f8480ce2cd2e5f8c599e29720071602ef633f37',
  '{admin}'
)
ON CONFLICT (id) DO NOTHING;
