#!/usr/bin/env bash
set -euo pipefail

# Kill-switch: cuts an institution's access INSTANTLY and REVERSIBLY.
# Database, files, secrets remain untouched — only the api+web containers
# are stopped. If the contract is renewed, tenant-resume.sh re-opens it as-is.
#
# Usage: scripts/tenant-suspend.sh <slug>

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <slug>" >&2
  exit 1
fi

SLUG="$1"

if ! docker ps -a --format '{{.Names}}' | grep -qx "${SLUG}-api"; then
  echo "ERROR: the ${SLUG}-api container does not exist. Check the institution name (was it created with scripts/tenant-create.sh?)." >&2
  exit 1
fi

echo "==> [$SLUG] suspending"
docker stop "${SLUG}-api" "${SLUG}-web"
echo "$SLUG is now unreachable. To re-open: scripts/tenant-resume.sh $SLUG"
