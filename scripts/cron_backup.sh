#!/usr/bin/env bash
set -euo pipefail
cd /home/runner/workspace
ENV_FILE=/home/runner/workspace/.env
export ENV_FILE
exec /bin/bash /home/runner/workspace/scripts/backup_neon.sh
