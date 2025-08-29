#!/usr/bin/env bash
set -euo pipefail
ENV_FILE=${ENV_FILE:-/home/runner/workspace/.env}
if [[ -z "${DATABASE_URL:-}" && -f "$ENV_FILE" ]]; then
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
out="$BACKUP_DIR/neondb-$ts.dump"
PGOPTIONS="-c statement_timeout=0" pg_dump --format=custom --file "$out" "$DATABASE_URL"
ln -sfn "$out" "$BACKUP_DIR/latest.dump"
# Optional S3 upload if configured (uses Node uploader; no AWS CLI required)
if [[ -n "${S3_BUCKET:-}" ]]; then
  if command -v node >/dev/null 2>&1; then
    node /home/runner/workspace/scripts/s3-upload.js \
      "$out" "$S3_BUCKET" "postgres/$(basename "$out")" "postgres/latest.dump" || true
  else
    echo "Node not found; skipping S3 upload" >&2
  fi
fi
# Optional: also upload latest to a separate bucket if provided
if [[ -n "${S3_BUCKET_LATEST:-}" ]]; then
  if command -v node >/dev/null 2>&1; then
    node /home/runner/workspace/scripts/s3-upload.js \
      "$out" "$S3_BUCKET_LATEST" "postgres/latest.dump" || true
  fi
fi
# Retention: delete dumps older than 14 days
find "$BACKUP_DIR" -type f -name "neondb-*.dump" -mtime +14 -delete
printf "Backup created: %s\n" "$out"
