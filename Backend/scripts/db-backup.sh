#!/bin/bash
# ─── Database Backup Script ─────────────────────────────────
# Usage: ./scripts/db-backup.sh [daily|weekly|manual]
#
# Backups are stored in ./backups/postgres/
# Retention: 7 daily, 4 weekly

set -euo pipefail

BACKUP_TYPE="${1:-manual}"
BACKUP_DIR="./backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"

# Config (override with env vars)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-propertyos}"
DB_USER="${DB_USER:-propertyos}"
PGPASSWORD="${POSTGRES_PASSWORD:-propertyos}"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

echo "📦 Starting ${BACKUP_TYPE} backup of ${DB_NAME}..."

# Dump and compress
PGPASSWORD="${PGPASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  | gzip > "${BACKUP_FILE}"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ Backup complete: ${BACKUP_FILE} (${FILESIZE})"

# ─── Retention policy ──────────────────────────────────────
echo "🧹 Cleaning old backups..."

# Keep last 7 daily backups
if [ "${BACKUP_TYPE}" = "daily" ]; then
  ls -t "${BACKUP_DIR}"/daily_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
  echo "  Retained last 7 daily backups"
fi

# Keep last 4 weekly backups
if [ "${BACKUP_TYPE}" = "weekly" ]; then
  ls -t "${BACKUP_DIR}"/weekly_*.sql.gz 2>/dev/null | tail -n +5 | xargs -r rm -f
  echo "  Retained last 4 weekly backups"
fi

# List current backups
echo ""
echo "📁 Current backups:"
ls -lh "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | awk '{print "  " $NF " (" $5 ")"}'

echo ""
echo "🎉 Done!"
