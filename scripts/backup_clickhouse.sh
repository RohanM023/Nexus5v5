#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/clickhouse}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CH_HOST="${CLICKHOUSE_HOST:-localhost}"
CH_PORT="${CLICKHOUSE_PORT:-9000}"

mkdir -p "$BACKUP_DIR"

echo "Starting ClickHouse backup..."
for table in matches synergy_matrix counter_matrix; do
    clickhouse-client --host="$CH_HOST" --port="$CH_PORT" \
        --query="SELECT * FROM $table FORMAT Native" | gzip > "$BACKUP_DIR/${table}_${TIMESTAMP}.native.gz"
    echo "Backed up: $table ($(du -h "$BACKUP_DIR/${table}_${TIMESTAMP}.native.gz" | cut -f1))"
done

# Clean up old backups
find "$BACKUP_DIR" -name "*.native.gz" -mtime "+$RETENTION_DAYS" -delete
echo "Cleaned up backups older than $RETENTION_DAYS days"
