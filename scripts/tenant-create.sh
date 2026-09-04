#!/usr/bin/env bash
set -euo pipefail

# Yeni bir kurum kurulumu oluşturur: ayrı Postgres DB+rol, ayrı MinIO bucket+kısıtlı
# kullanıcı, ayrı Redis DB index'i, ayrı .env, Caddy subdomain bloğu, ve api+web
# container çifti. Önce deploy/docker-compose.base.yml'nin ayakta olması gerekir.
#
# Kullanım:
#   scripts/tenant-create.sh <slug> "<Kurum Adı>" <domain> [admin-email]
#
# Örnekler:
#   scripts/tenant-create.sh altinsaray "Altınsaray Bakım Merkezi" altinsaray.bakimbilgisistemi.com
#   scripts/tenant-create.sh altinsaray "Altınsaray Bakım Merkezi" http://altinsaray.localhost   # local test

if [[ $# -lt 3 ]]; then
  echo "Kullanım: $0 <slug> \"<Kurum Adı>\" <domain> [admin-email]" >&2
  exit 1
fi

SLUG="$1"
INSTITUTION_NAME="$2"
DOMAIN="$3"
ADMIN_EMAIL="${4:-admin@${SLUG}.local}"

if [[ ! "$SLUG" =~ ^[a-z0-9][a-z0-9-]{1,30}$ ]]; then
  echo "HATA: slug sadece küçük harf, rakam ve tire içermeli, örn: altinsaray" >&2
  exit 1
fi

for cmd in docker openssl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "HATA: '$cmd' bulunamadı, PATH'e ekli olmalı." >&2
    exit 1
  fi
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$ROOT_DIR/deploy"
TENANT_DIR="$DEPLOY_DIR/tenants/$SLUG"
PLATFORM_ENV="$DEPLOY_DIR/.env.platform"

if [[ -d "$TENANT_DIR" ]]; then
  echo "HATA: $SLUG için kurulum zaten var ($TENANT_DIR). Kaldırmak için tenant-remove.sh kullan." >&2
  exit 1
fi

if [[ ! -f "$PLATFORM_ENV" ]]; then
  echo "HATA: $PLATFORM_ENV yok. Önce 'cp deploy/.env.platform.example deploy/.env.platform' yapıp doldur." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$PLATFORM_ENV"
set +a

for var in PLATFORM_POSTGRES_USER PLATFORM_POSTGRES_PASSWORD PLATFORM_REDIS_PASSWORD PLATFORM_MINIO_ROOT_USER PLATFORM_MINIO_ROOT_PASSWORD; do
  if [[ -z "${!var:-}" ]]; then
    echo "HATA: $PLATFORM_ENV içinde $var boş." >&2
    exit 1
  fi
done

if ! docker ps --format '{{.Names}}' | grep -qx bakimevi-platform-postgres; then
  echo "HATA: bakimevi-platform-postgres çalışmıyor. Önce deploy/docker-compose.base.yml'yi ayağa kaldır." >&2
  exit 1
fi

echo "==> [$SLUG] secret'lar üretiliyor"
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

echo "==> [$SLUG] boşta olan Redis DB index aranıyor"
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
  echo "HATA: kullanılabilir Redis DB index kalmadı (paylaşımlı Redis'te en fazla 15 kurum barınabilir)." >&2
  exit 1
fi
echo "    Redis DB index: $REDIS_INDEX"

echo "==> [$SLUG] Postgres veritabanı ve rolü oluşturuluyor"
docker exec -i -e PGPASSWORD="$PLATFORM_POSTGRES_PASSWORD" bakimevi-platform-postgres \
  psql -v ON_ERROR_STOP=1 -U "$PLATFORM_POSTGRES_USER" -d postgres <<SQL
CREATE DATABASE ${DB_NAME};
CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};
SQL

echo "==> [$SLUG] MinIO bucket ve bucket'a kısıtlı erişim kullanıcısı oluşturuluyor"
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

echo "==> [$SLUG] .env yazılıyor"
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

echo "==> [$SLUG] veritabanı şeması uygulanıyor (prisma migrate deploy)"
docker run --rm --network bakimevi-net --env-file "$TENANT_DIR/.env" \
  --entrypoint npx bakimevi-api:latest prisma migrate deploy

echo "==> [$SLUG] kurum admini oluşturuluyor"
docker run --rm --network bakimevi-net --env-file "$TENANT_DIR/.env" \
  -e TENANT_ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e TENANT_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  --entrypoint npx bakimevi-api:latest tsx prisma/seed-tenant.ts

echo "==> [$SLUG] Caddy site bloğu ekleniyor"
sed -e "s#__DOMAIN__#${DOMAIN}#g" -e "s#__SLUG__#${SLUG}#g" \
  "$DEPLOY_DIR/caddy/site.caddy.template" > "$DEPLOY_DIR/caddy/sites/${SLUG}.caddy"
if docker ps --format '{{.Names}}' | grep -qx bakimevi-platform-caddy; then
  docker exec bakimevi-platform-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
else
  echo "UYARI: bakimevi-platform-caddy çalışmıyor, site bloğu yazıldı ama reload edilemedi."
fi

echo "==> [$SLUG] container'lar başlatılıyor"
TENANT_SLUG="$SLUG" docker compose -f "$DEPLOY_DIR/docker-compose.tenant.yml" \
  --env-file "$TENANT_DIR/.env" \
  -p "$SLUG" \
  up -d

cat <<SUMMARY

==================================================
$SLUG ($INSTITUTION_NAME) kuruldu.

  Adres:          $DOMAIN
  Admin e-posta:  $ADMIN_EMAIL
  Admin şifre:    $ADMIN_PASSWORD   (şimdi kaydet, tekrar gösterilmeyecek)

  .env dosyası:   $TENANT_DIR/.env  (chmod 600)
  Askıya almak:   scripts/tenant-suspend.sh $SLUG
  Kalıcı silmek:  scripts/tenant-remove.sh $SLUG --purge
==================================================
SUMMARY
