#!/usr/bin/env bash
set -euo pipefail
ENV_FILE=${ENV_FILE:-/home/runner/workspace/.env}
if [[ -f "$ENV_FILE" ]]; then
  set +u
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  set -u
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Set it in .env or environment." >&2
  exit 1
fi
BACKUP_DIR=${BACKUP_DIR:-/home/runner/workspace/backups}
mkdir -p "$BACKUP_DIR"
ts="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/globals-$ts.sql"
pg_dumpall --globals-only "$DATABASE_URL" > "$out"
# Optional S3 upload
if command -v aws >/dev/null 2>&1 && [[ -n "${S3_BUCKET:-}" ]]; then
  aws s3 cp "$out" "s3://$S3_BUCKET/postgres/$(basename "$out")" --sse AES256 || true
fi
# Retention: delete globals older than 60 days
find "$BACKUP_DIR" -type f -name "globals-*.sql" -mtime +60 -delete
printf "Globals backup created: %s\n" "$out"
