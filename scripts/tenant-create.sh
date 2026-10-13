#!/usr/bin/env bash
set -euo pipefail

# Creates a new institution setup: separate Postgres DB+role, separate MinIO bucket+restricted
# user, separate Redis DB index, separate .env, Caddy subdomain block, and api+web
# container pair. deploy/docker-compose.base.yml must be up first.
#
# Usage:
#   scripts/tenant-create.sh <slug> "<Institution Name>" <domain> [admin-email]
#
# Examples:
#   scripts/tenant-create.sh altinsaray "Altinsaray Care Center" altinsaray.bakimbilgisistemi.com
#   scripts/tenant-create.sh altinsaray "Altinsaray Care Center" http://altinsaray.localhost   # local test

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <slug> \"<Institution Name>\" <domain> [admin-email]" >&2
  exit 1
fi

SLUG="$1"
INSTITUTION_NAME="$2"
DOMAIN="$3"
ADMIN_EMAIL="${4:-admin@${SLUG}.local}"

if [[ ! "$SLUG" =~ ^[a-z0-9][a-z0-9-]{1,30}$ ]]; then
  echo "ERROR: slug must contain only lowercase letters, digits and hyphens, e.g. altinsaray" >&2
  exit 1
fi

for cmd in docker openssl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: '$cmd' not found, it must be on PATH." >&2
    exit 1
  fi
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$ROOT_DIR/deploy"
TENANT_DIR="$DEPLOY_DIR/tenants/$SLUG"
PLATFORM_ENV="$DEPLOY_DIR/.env.platform"

if [[ -d "$TENANT_DIR" ]]; then
  echo "ERROR: a setup for $SLUG already exists ($TENANT_DIR). Use tenant-remove.sh to remove it." >&2
  exit 1
fi

if [[ ! -f "$PLATFORM_ENV" ]]; then
  echo "ERROR: $PLATFORM_ENV is missing. First run 'cp deploy/.env.platform.example deploy/.env.platform' and fill it in." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$PLATFORM_ENV"
set +a

for var in PLATFORM_POSTGRES_USER PLATFORM_POSTGRES_PASSWORD PLATFORM_REDIS_PASSWORD PLATFORM_MINIO_ROOT_USER PLATFORM_MINIO_ROOT_PASSWORD; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: $var is empty in $PLATFORM_ENV." >&2
    exit 1
  fi
done

if ! docker ps --format '{{.Names}}' | grep -qx bakimevi-platform-postgres; then
  echo "ERROR: bakimevi-platform-postgres is not running. Bring up deploy/docker-compose.base.yml first." >&2
  exit 1
fi

echo "==> [$SLUG] generating secrets"
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
MASTER_ENCRYPTION_KEY=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
MINIO_SECRET_KEY=$(openssl rand -hex 20)
ADMIN_PASSWORD=$(openssl rand -hex 8)

DB_NAME="${SLUG}_db"
DB_USER="${SLUG}_user"
BUCKET="${SLUG}-documents"
MINIO_USER="${SLUG}-svc"

echo "==> [$SLUG] searching for a free Redis DB index"
USED_INDEXES=""
if compgen -G "$DEPLOY_DIR/tenants/*/.env" > /dev/null; then
  USED_INDEXES=$(grep -h "^REDIS_URL=" "$DEPLOY_DIR"/tenants/*/.env 2>/dev/null | sed -E 's#.*/([0-9]+)$#\1#')
fi
REDIS_INDEX=""
for i in $(seq 1 15); do
  if ! grep -qx "$i" <<< "$USED_INDEXES"; then
    REDIS_INDEX="$i"
    break
  fi
done
if [[ -z "$REDIS_INDEX" ]]; then
  echo "ERROR: no available Redis DB index left (a shared Redis can host at most 15 institutions)." >&2
  exit 1
fi
echo "    Redis DB index: $REDIS_INDEX"

echo "==> [$SLUG] creating Postgres database and role"
docker exec -i -e PGPASSWORD="$PLATFORM_POSTGRES_PASSWORD" bakimevi-platform-postgres \
  psql -v ON_ERROR_STOP=1 -U "$PLATFORM_POSTGRES_USER" -d postgres <<SQL
CREATE DATABASE ${DB_NAME};
CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};
SQL

echo "==> [$SLUG] creating MinIO bucket and a user with restricted access to it"
POLICY_FILE=$(mktemp)
trap 'rm -f "$POLICY_FILE"' EXIT
cat > "$POLICY_FILE" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::${BUCKET}", "arn:aws:s3:::${BUCKET}/*"]
    }
  ]
}
JSON

docker run --rm --network bakimevi-net \
  -v "$POLICY_FILE:/tmp/policy.json:ro" \
  --entrypoint sh minio/mc -c "
    mc alias set platform http://bakimevi-platform-minio:9000 '$PLATFORM_MINIO_ROOT_USER' '$PLATFORM_MINIO_ROOT_PASSWORD' >/dev/null &&
    mc mb --ignore-existing platform/${BUCKET} &&
    mc admin user add platform ${MINIO_USER} '${MINIO_SECRET_KEY}' &&
    mc admin policy create platform ${SLUG}-policy /tmp/policy.json &&
    mc admin policy attach platform ${SLUG}-policy --user ${MINIO_USER}
  "

echo "==> [$SLUG] writing .env"
mkdir -p "$TENANT_DIR"
cat > "$TENANT_DIR/.env" <<ENV
NODE_ENV=production
INSTITUTION_NAME=${INSTITUTION_NAME}

DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@bakimevi-platform-postgres:5432/${DB_NAME}

REDIS_URL=redis://:${PLATFORM_REDIS_PASSWORD}@bakimevi-platform-redis:6379/${REDIS_INDEX}

JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=8h

MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY}

MINIO_ENDPOINT=bakimevi-platform-minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=${MINIO_USER}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
MINIO_BUCKET=${BUCKET}
MINIO_USE_SSL=false

API_PORT=3001
FRONTEND_URL=${DOMAIN}
API_URL=${DOMAIN}
ALLOWED_ORIGINS=${DOMAIN}

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5

RESEND_API_KEY=${RESEND_API_KEY:-}
RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL:-onboarding@resend.dev}
NOTIFY_EMAIL=${NOTIFY_EMAIL:-arslannizzet10@gmail.com}
ENV
chmod 600 "$TENANT_DIR/.env"

echo "==> [$SLUG] applying database schema (prisma migrate deploy)"
docker run --rm --network bakimevi-net --env-file "$TENANT_DIR/.env" \
  --entrypoint npx bakimevi-api:latest prisma migrate deploy

echo "==> [$SLUG] creating institution admin"
docker run --rm --network bakimevi-net --env-file "$TENANT_DIR/.env" \
  -e TENANT_ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e TENANT_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  --entrypoint npx bakimevi-api:latest tsx prisma/seed-tenant.ts

echo "==> [$SLUG] adding Caddy site block"
sed -e "s#__DOMAIN__#${DOMAIN}#g" -e "s#__SLUG__#${SLUG}#g" \
  "$DEPLOY_DIR/caddy/site.caddy.template" > "$DEPLOY_DIR/caddy/sites/${SLUG}.caddy"
if docker ps --format '{{.Names}}' | grep -qx bakimevi-platform-caddy; then
  docker exec bakimevi-platform-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
else
  echo "WARNING: bakimevi-platform-caddy is not running; the site block was written but could not be reloaded."
fi

echo "==> [$SLUG] starting containers"
TENANT_SLUG="$SLUG" docker compose -f "$DEPLOY_DIR/docker-compose.tenant.yml" \
  --env-file "$TENANT_DIR/.env" \
  -p "$SLUG" \
  up -d

cat <<SUMMARY

==================================================
$SLUG ($INSTITUTION_NAME) kuruldu.

  Adres:          $DOMAIN
  Admin e-posta:  $ADMIN_EMAIL
  Admin password: $ADMIN_PASSWORD   (save it now, it won't be shown again)

  .env file:      $TENANT_DIR/.env  (chmod 600)
  Suspend:        scripts/tenant-suspend.sh $SLUG
  Permanent delete: scripts/tenant-remove.sh $SLUG --purge
==================================================
SUMMARY
