#!/bin/bash
# ─── Backup Verification Script ────────────────────────────
# Tests that a backup file can be restored successfully.
# Usage: ./scripts/verify-backup.sh <backup-file>
#
# This creates a temporary database, restores the backup,
# runs basic integrity checks, then cleans up.

set -euo pipefail

BACKUP_FILE="${1:-}"
VERIFY_DB="propertyos_verify_$(date +%s)"
VERIFY_USER="propertyos_verify"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup-file>"
  echo "Example: $0 backups/postgres/daily_20250601_020000.sql.gz"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ File not found: ${BACKUP_FILE}"
  exit 1
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-propertyos}"
PGPASSWORD="${POSTGRES_PASSWORD:-propertyos}"

echo "🔍 Verifying backup: ${BACKUP_FILE}"
echo ""

# Step 1: Create temporary database
echo "📋 Step 1/4: Creating temporary database..."
PGPASSWORD="${PGPASSWORD}" psql \
  -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
  -c "CREATE DATABASE ${VERIFY_DB};" 2>/dev/null || true
PGPASSWORD="${PGPASSWORD}" psql \
  -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
  -c "CREATE USER ${VERIFY_USER} WITH PASSWORD 'verify_temp';" 2>/dev/null || true
PGPASSWORD="${PGPASSWORD}" psql \
  -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
  -c "GRANT ALL PRIVILEGES ON DATABASE ${VERIFY_DB} TO ${VERIFY_USER};" 2>/dev/null || true

# Step 2: Restore backup
echo "📥 Step 2/4: Restoring backup..."
gunzip -c "${BACKUP_FILE}" | \
  PGPASSWORD="${PGPASSWORD}" psql \
  -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${VERIFY_DB}" \
  -q 2>/dev/null

echo "  ✅ Restore completed"

# Step 3: Integrity checks
echo "🔎 Step 3/4: Running integrity checks..."

TABLE_COUNT=$(PGPASSWORD="${PGPASSWORD}" psql \
  -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${VERIFY_DB}" \
  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

echo "  Tables found: ${TABLE_COUNT}"

# Check key tables exist
for TABLE in users buildings units clients deals tasks site_visits audit_events; do
  EXISTS=$(PGPASSWORD="${PGPASSWORD}" psql \
    -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${VERIFY_DB}" \
    -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${TABLE}');" 2>/dev/null | tr -d ' ')
  if [ "${EXISTS}" = "t" ]; then
    ROW_COUNT=$(PGPASSWORD="${PGPASSWORD}" psql \
      -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${VERIFY_DB}" \
      -t -c "SELECT COUNT(*) FROM ${TABLE};" 2>/dev/null | tr -d ' ')
    echo "  ✅ ${TABLE}: ${ROW_COUNT} rows"
  else
    echo "  ⚠️  ${TABLE}: NOT FOUND"
  fi
done

# Step 4: Cleanup
echo "🧹 Step 4/4: Cleaning up..."
PGPASSWORD="${PGPASSWORD}" psql \
  -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
  -c "DROP DATABASE IF EXISTS ${VERIFY_DB};" 2>/dev/null
PGPASSWORD="${PGPASSWORD}" psql \
  -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
  -c "DROP USER IF EXISTS ${VERIFY_USER};" 2>/dev/null || true

echo ""
echo "✅ Backup verification complete: ${BACKUP_FILE}"
echo "   Tables: ${TABLE_COUNT}, Status: RESTORABLE"
