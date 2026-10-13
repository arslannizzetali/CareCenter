#!/usr/bin/env bash
set -euo pipefail

# Default: stops and removes the containers but leaves data/secrets untouched
#             (containers can be brought up again with the same slug via tenant-create.sh,
#             data is preserved).
# --purge:    in addition to the above, PERMANENTLY deletes the database, MinIO bucket+user,
#             Caddy site block and .env file. CANNOT BE UNDONE.
#
# Usage: scripts/tenant-remove.sh <slug> [--purge]

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <slug> [--purge]" >&2
  exit 1
fi

SLUG="$1"
PURGE="${2:-}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$ROOT_DIR/deploy"
TENANT_DIR="$DEPLOY_DIR/tenants/$SLUG"
PLATFORM_ENV="$DEPLOY_DIR/.env.platform"

echo "==> [$SLUG] stopping and removing containers"
if [[ -f "$TENANT_DIR/.env" ]]; then
  TENANT_SLUG="$SLUG" docker compose -f "$DEPLOY_DIR/docker-compose.tenant.yml" \
    --env-file "$TENANT_DIR/.env" -p "$SLUG" down || true
else
  docker rm -f "${SLUG}-api" "${SLUG}-web" 2>/dev/null || true
fi

if [[ "$PURGE" != "--purge" ]]; then
  echo "$SLUG stopped (data preserved). To permanently delete: $0 $SLUG --purge"
  exit 0
fi

echo "!! [$SLUG] PERMANENT DELETION starting — database, files and secrets will be irreversibly deleted."
read -r -p "Type '$SLUG' and press Enter to continue: " CONFIRM
if [[ "$CONFIRM" != "$SLUG" ]]; then
  echo "Not confirmed, aborted." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$PLATFORM_ENV"
set +a

DB_NAME="${SLUG}_db"
DB_USER="${SLUG}_user"
BUCKET="${SLUG}-documents"
MINIO_USER="${SLUG}-svc"

echo "==> [$SLUG] deleting Postgres database and role"
docker exec -i -e PGPASSWORD="$PLATFORM_POSTGRES_PASSWORD" bakimevi-platform-postgres \
  psql -v ON_ERROR_STOP=1 -U "$PLATFORM_POSTGRES_USER" -d postgres <<SQL
DROP DATABASE IF EXISTS ${DB_NAME};
DROP ROLE IF EXISTS ${DB_USER};
SQL

echo "==> [$SLUG] deleting MinIO bucket and user"
docker run --rm --network bakimevi-net --entrypoint sh minio/mc -c "
  mc alias set platform http://bakimevi-platform-minio:9000 '$PLATFORM_MINIO_ROOT_USER' '$PLATFORM_MINIO_ROOT_PASSWORD' >/dev/null &&
  mc admin user remove platform ${MINIO_USER} || true &&
  mc admin policy rm platform ${SLUG}-policy || true &&
  mc rb --force platform/${BUCKET} || true
"

echo "==> [$SLUG] removing Caddy site block"
rm -f "$DEPLOY_DIR/caddy/sites/${SLUG}.caddy"
if docker ps --format '{{.Names}}' | grep -qx bakimevi-platform-caddy; then
  docker exec bakimevi-platform-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
fi

echo "==> [$SLUG] deleting .env and tenant folder"
rm -rf "$TENANT_DIR"

echo "$SLUG permanently deleted."
