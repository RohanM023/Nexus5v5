#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="nexus_pg_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting PostgreSQL backup..."
pg_dump "${DATABASE_URL:-postgresql://nexus:nexus@localhost:5432/nexus}" | gzip > "$BACKUP_DIR/$FILENAME"
echo "Backup created: $BACKUP_DIR/$FILENAME ($(du -h "$BACKUP_DIR/$FILENAME" | cut -f1))"

# Clean up old backups
find "$BACKUP_DIR" -name "nexus_pg_*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
echo "Cleaned up backups older than $RETENTION_DAYS days"
