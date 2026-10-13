#!/usr/bin/env bash
set -euo pipefail

# Re-opens an institution stopped by tenant-suspend.sh, with no data loss.
#
# Usage: scripts/tenant-resume.sh <slug>

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <slug>" >&2
  exit 1
fi

SLUG="$1"

if ! docker ps -a --format '{{.Names}}' | grep -qx "${SLUG}-api"; then
  echo "ERROR: the ${SLUG}-api container does not exist." >&2
  exit 1
fi

echo "==> [$SLUG] resuming"
docker start "${SLUG}-api" "${SLUG}-web"
echo "$SLUG is reachable again."
