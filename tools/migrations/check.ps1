# DEPUKO migration verifier.
# Fresh database: apply all migrations and record each successful file.
# Upgraded database: requires an existing depuko_schema_migrations table OR
# an explicit -UpgradedThrough assertion after the operator has verified the
# existing schema. Never blindly replays non-idempotent historical migrations.
param(
  [Parameter(Mandatory=$true)][string]$FreshDb,
  [Parameter(Mandatory=$true)][string]$UpgradedDb,
  [int]$UpgradedThrough = -1
)
$ErrorActionPreference = "Stop"
$dir = Join-Path $PSScriptRoot "..\..\database\migrations"
$files = @(Get-ChildItem $dir -Filter *.sql | Sort-Object Name)
if ($files.Count -eq 0) { throw "No migration files found in $dir" }

function Invoke-Psql([string]$db, [string]$sql) {
  $out = & psql -v ON_ERROR_STOP=1 -q -At $db -c $sql
  if ($LASTEXITCODE -ne 0) { throw "psql failed: $sql" }
  return ($out | Out-String).Trim()
}
function Ensure-Tracker([string]$db) {
  Invoke-Psql $db "CREATE TABLE IF NOT EXISTS depuko_schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());" | Out-Null
}
function Apply-Pending([string]$db, [int]$skipThrough) {
  Ensure-Tracker $db
  foreach ($file in $files) {
    $number = [int]([regex]::Match($file.Name, '^([0-9]{4})_').Groups[1].Value)
    if ($number -le $skipThrough) { continue }
    $exists = Invoke-Psql $db "SELECT 1 FROM depuko_schema_migrations WHERE name='$($file.Name)' LIMIT 1;"
    if ($exists -eq '1') { continue }
    Write-Host "==> applying $($file.Name)"
    & psql -v ON_ERROR_STOP=1 -q $db -f $file.FullName
    if ($LASTEXITCODE -ne 0) { throw "MIGRATION FAILED: $($file.Name)" }
    Invoke-Psql $db "INSERT INTO depuko_schema_migrations(name) VALUES ('$($file.Name)') ON CONFLICT DO NOTHING;" | Out-Null
  }
}
function Initialize-UpgradedTracker([string]$db, [int]$through) {
  Ensure-Tracker $db
  $count = [int](Invoke-Psql $db "SELECT count(*) FROM depuko_schema_migrations;")
  if ($count -gt 0) { return }
  if ($through -lt 1 -or $through -gt 16) {
    throw "UpgradedDb has no migration tracker. Specify -UpgradedThrough N only after verifying that schema is already migrated through N (1-16)."
  }
  $sentinels = @{
    1='service_versions'; 2='users'; 3='orders'; 4='ledger_entries'; 5='payouts';
    6='business_onboarding_sessions'; 7='project_services'; 8='audit_events';
    9='payments'; 10='audit_events'; 11='assignments'; 12='disputes';
    13='contracts'; 14='notifications'; 15='quotes'; 16='payout_holds'
  }
  $sentinel = $sentinels[$through]
  if ($through -eq 10) {
    $present = Invoke-Psql $db "SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_audit_append_only' AND NOT tgisinternal) THEN '1' ELSE '0' END;"
  } else {
    $present = Invoke-Psql $db "SELECT CASE WHEN to_regclass('public.$sentinel') IS NULL THEN '0' ELSE '1' END;"
  }
  if ($present -ne '1') { throw "UpgradedDb does not contain sentinel table '$sentinel' for migration $through. No migration rows were marked." }
  Write-Warning "Operator assertion: marking migrations 0001-$('{0:D4}' -f $through) as already applied. Verify the full schema yourself; the sentinel is not a complete schema audit."
  foreach ($file in $files) {
    $number = [int]([regex]::Match($file.Name, '^([0-9]{4})_').Groups[1].Value)
    if ($number -le $through) {
      Invoke-Psql $db "INSERT INTO depuko_schema_migrations(name) VALUES ('$($file.Name)') ON CONFLICT DO NOTHING;" | Out-Null
    }
  }
}

Write-Host "=== DEPUKO MIGRATION CHECK ==="
Write-Host "Fresh database: applying all unapplied migration files"
Apply-Pending $FreshDb 0
Write-Host "Upgraded database: using migration tracker"
Initialize-UpgradedTracker $UpgradedDb $UpgradedThrough
Apply-Pending $UpgradedDb 0
Write-Host "=== MIGRATIONS APPLIED / TRACKED ===" -ForegroundColor Green
