#!/usr/bin/env bash
set -euo pipefail

# Lokal geliştirme ortamını tek komutla ayağa kaldırır:
#   - Docker servisleri (Postgres, Redis, MinIO)
#   - Prisma client + veritabanı şeması (migrate deploy)
#   - Seed verisi (admin + örnek çalışan/engelli kayıtları)
#
# Kullanım:
#   ./scripts/local-up.sh
# Sonra ayrı bir terminalde:
#   corepack pnpm dev

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Docker çalışıyor mu?"
if ! docker info >/dev/null 2>&1; then
  echo "HATA: Docker daemon çalışmıyor. Docker Desktop'ı açıp tekrar dene." >&2
  exit 1
fi

echo "==> Bağımlılıklar (pnpm install)"
corepack pnpm install

echo "==> Docker servisleri başlatılıyor (postgres, redis, minio)"
docker compose up -d postgres redis minio

echo "==> Postgres hazır olana kadar bekleniyor"
for i in $(seq 1 30); do
  if docker exec bakimevi-postgres pg_isready -U bakim_user -d bakim_db >/dev/null 2>&1; then
    echo "    Postgres hazır."
    break
  fi
  if [[ "$i" == "30" ]]; then
    echo "HATA: Postgres 30 sn içinde hazır olmadı." >&2
    exit 1
  fi
  sleep 1
done

echo "==> Prisma client üretiliyor"
corepack pnpm db:generate

echo "==> Veritabanı şeması uygulanıyor (migrate deploy)"
corepack pnpm --filter @bakimevi/api exec prisma migrate deploy

echo "==> Seed verisi yükleniyor"
corepack pnpm db:seed

cat <<'DONE'

==================================================
Lokal ortam hazır.

  Web:            http://localhost:3000
  API:           http://localhost:3001/health
  MinIO konsol:   http://localhost:9001  (minioadmin / minioadmin)

  Giriş:
    admin@bakimevi.com   / Admin123!
    ahmet@bakimevi.com    / Calisan123!

Şimdi başlat:
  corepack pnpm dev

Durdurmak için:
  docker compose down
==================================================
DONE
