-- 0010_audit_guard.sql - DB-enforced append-only audit (V5 fix #5)
BEGIN;
CREATE OR REPLACE FUNCTION depuko_audit_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: UPDATE/DELETE are forbidden';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_append_only
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION depuko_audit_block_mutation();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'depuko_app') THEN
    REVOKE UPDATE, DELETE ON audit_events FROM depuko_app;
  ELSE
    RAISE NOTICE 'role depuko_app not found - create it and revoke UPDATE/DELETE on audit_events, then re-run this migration';
  END IF;
END $$;
COMMIT;