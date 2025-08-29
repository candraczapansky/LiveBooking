#!/usr/bin/env bash
set -euo pipefail
FILE="${1:-}"
DB="${2:-restore_test}"
if [[ -z "$FILE" ]]; then
  echo "Usage: $0 <dump_file> [restore_db_name]" >&2
  exit 1
fi
createdb "$DB" 2>/dev/null || true
pg_restore --clean --if-exists --no-owner --dbname="$DB" "$FILE"
psql "$DB" -c "SELECT now() as restored_at, count(*) as tables FROM information_schema.tables WHERE table_schema NOT IN (pg_catalog,information_schema);" | cat
