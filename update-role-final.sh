#!/bin/bash

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL must be set" >&2
  exit 1
fi

# First, check current user info
psql "$DATABASE_URL" -c "SELECT id, username, first_name, last_name, role FROM users WHERE id = 1;"

# Update user role to admin
psql "$DATABASE_URL" -c "UPDATE users SET role = 'admin' WHERE id = 1 RETURNING id, username, first_name, last_name, role;"
