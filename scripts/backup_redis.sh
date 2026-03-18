#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/redis}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

mkdir -p "$BACKUP_DIR"

echo "Starting Redis backup..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE
echo "Waiting for BGSAVE to complete..."
sleep 2

REDIS_DIR=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" CONFIG GET dir | tail -n1)
cp "$REDIS_DIR/dump.rdb" "$BACKUP_DIR/dump_${TIMESTAMP}.rdb"
echo "Backup created: $BACKUP_DIR/dump_${TIMESTAMP}.rdb ($(du -h "$BACKUP_DIR/dump_${TIMESTAMP}.rdb" | cut -f1))"

# Clean up old backups
find "$BACKUP_DIR" -name "dump_*.rdb" -mtime "+$RETENTION_DAYS" -delete
echo "Cleaned up backups older than $RETENTION_DAYS days"
