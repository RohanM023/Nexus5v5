# Backup & Restore Procedures

## Overview

Nexus-5v5 uses three data stores that require regular backups:

| Store | Script | Retention | Schedule |
|-------|--------|-----------|----------|
| PostgreSQL | `scripts/backup_postgres.sh` | 7 days | Daily 2:00 AM |
| ClickHouse | `scripts/backup_clickhouse.sh` | 7 days | Daily 2:30 AM |
| Redis | `scripts/backup_redis.sh` | 7 days | Daily 3:00 AM |

## Cron Schedule

Add to crontab (`crontab -e`):

```cron
0  2 * * * /opt/nexus/scripts/backup_postgres.sh   >> /var/log/nexus/backup_pg.log 2>&1
30 2 * * * /opt/nexus/scripts/backup_clickhouse.sh  >> /var/log/nexus/backup_ch.log 2>&1
0  3 * * * /opt/nexus/scripts/backup_redis.sh       >> /var/log/nexus/backup_redis.log 2>&1
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_DIR` | `/backups/<store>` | Backup output directory |
| `RETENTION_DAYS` | `7` | Days to keep old backups |
| `DATABASE_URL` | `postgresql://nexus:nexus@localhost:5432/nexus` | PostgreSQL connection |
| `CLICKHOUSE_HOST` | `localhost` | ClickHouse hostname |
| `CLICKHOUSE_PORT` | `9000` | ClickHouse native port |
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |

## PostgreSQL

### Backup

```bash
BACKUP_DIR=/backups/postgres ./scripts/backup_postgres.sh
```

Creates a gzipped SQL dump: `nexus_pg_YYYYMMDD_HHMMSS.sql.gz`

### Restore

```bash
gunzip -c /backups/postgres/nexus_pg_20260318_020000.sql.gz | \
  psql "postgresql://nexus:nexus@localhost:5432/nexus"
```

To restore to a fresh database:

```bash
createdb -U nexus nexus_restored
gunzip -c /backups/postgres/nexus_pg_20260318_020000.sql.gz | \
  psql "postgresql://nexus:nexus@localhost:5432/nexus_restored"
```

## ClickHouse

### Backup

```bash
BACKUP_DIR=/backups/clickhouse ./scripts/backup_clickhouse.sh
```

Creates Native-format compressed files per table:
- `matches_YYYYMMDD_HHMMSS.native.gz`
- `synergy_matrix_YYYYMMDD_HHMMSS.native.gz`
- `counter_matrix_YYYYMMDD_HHMMSS.native.gz`

### Restore

```bash
gunzip -c /backups/clickhouse/matches_20260318_023000.native.gz | \
  clickhouse-client --host=localhost --query="INSERT INTO matches FORMAT Native"
```

Repeat for each table (`synergy_matrix`, `counter_matrix`).

## Redis

### Backup

```bash
BACKUP_DIR=/backups/redis ./scripts/backup_redis.sh
```

Creates an RDB snapshot: `dump_YYYYMMDD_HHMMSS.rdb`

### Restore

1. Stop the Redis server
2. Copy the backup RDB file to the Redis data directory:
   ```bash
   cp /backups/redis/dump_20260318_030000.rdb /var/lib/redis/dump.rdb
   ```
3. Start the Redis server — it will load the RDB on startup

## Verification

After restoring, verify data integrity:

```bash
# PostgreSQL
psql $DATABASE_URL -c "SELECT count(*) FROM users;"

# ClickHouse
clickhouse-client --query="SELECT count() FROM matches;"

# Redis
redis-cli -h $REDIS_HOST DBSIZE
```
