#!/usr/bin/env bash
# Usage: ./check.sh FRESH_DATABASE_URL UPGRADED_DATABASE_URL [UPGRADED_THROUGH]
# Upgraded databases must have depuko_schema_migrations or an explicit, reviewed
# version assertion. This script never blindly replays every historical SQL file.
set -euo pipefail
FRESH_DB="${1:?fresh database URL required}"
UPGRADED_DB="${2:?upgraded database URL required}"
UPGRADED_THROUGH="${3:--1}"
DIR="$(cd "$(dirname "$0")/../../database/migrations" && pwd)"

ensure_tracker() {
  psql -v ON_ERROR_STOP=1 -q "$1" -c "CREATE TABLE IF NOT EXISTS depuko_schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());"
}
apply_pending() {
  local db="$1"
  ensure_tracker "$db"
  for f in "$DIR"/*.sql; do
    name="$(basename "$f")"
    exists="$(psql -v ON_ERROR_STOP=1 -qAt "$db" -c "SELECT 1 FROM depuko_schema_migrations WHERE name='$name' LIMIT 1;")"
    if [[ "$exists" == "1" ]]; then continue; fi
    echo "==> applying $name"
    psql -v ON_ERROR_STOP=1 -q "$db" -f "$f"
    psql -v ON_ERROR_STOP=1 -q "$db" -c "INSERT INTO depuko_schema_migrations(name) VALUES ('$name') ON CONFLICT DO NOTHING;"
  done
}

ensure_upgraded_tracker() {
  local db="$1"; local through="$2"
  ensure_tracker "$db"
  count="$(psql -v ON_ERROR_STOP=1 -qAt "$db" -c "SELECT count(*) FROM depuko_schema_migrations;")"
  if [[ "$count" != "0" ]]; then return; fi
  if ! [[ "$through" =~ ^[0-9]+$ ]] || (( through < 1 || through > 16 )); then
    echo "ERROR: upgraded DB has no tracker. Pass reviewed UPGRADED_THROUGH (1-16)." >&2; exit 2
  fi
  sentinels=("" service_versions users orders ledger_entries payouts business_onboarding_sessions project_services audit_events payments audit_events assignments disputes contracts notifications quotes payout_holds)
  sentinel="${sentinels[$through]}"
  if (( through == 10 )); then
    present="$(psql -v ON_ERROR_STOP=1 -qAt "$db" -c "SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_audit_append_only' AND NOT tgisinternal) THEN '1' ELSE '0' END;")"
  else
    present="$(psql -v ON_ERROR_STOP=1 -qAt "$db" -c "SELECT CASE WHEN to_regclass('public.$sentinel') IS NULL THEN '0' ELSE '1' END;")"
  fi
  if [[ "$present" != "1" ]]; then echo "ERROR: expected sentinel $sentinel missing; refusing to mark old migrations." >&2; exit 2; fi
  echo "WARNING: marking migrations through $through based on operator assertion; sentinel is not a complete schema audit." >&2
  for f in "$DIR"/*.sql; do
    name="$(basename "$f")"; n=$((10#${name%%_*}))
    if (( n <= through )); then psql -v ON_ERROR_STOP=1 -q "$db" -c "INSERT INTO depuko_schema_migrations(name) VALUES ('$name') ON CONFLICT DO NOTHING;"; fi
  done
}

echo "=== DEPUKO MIGRATION CHECK ==="
apply_pending "$FRESH_DB"
ensure_upgraded_tracker "$UPGRADED_DB" "$UPGRADED_THROUGH"
apply_pending "$UPGRADED_DB"
echo "=== MIGRATIONS APPLIED / TRACKED ==="
