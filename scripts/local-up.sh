#!/usr/bin/env bash
set -euo pipefail

# Brings up the local development environment with a single command:
#   - Docker servisleri (Postgres, Redis, MinIO)
#   - Prisma client + database schema (migrate deploy)
#   - Seed data (admin + sample staff/patient records)
#
# Usage:
#   ./scripts/local-up.sh
# Then in a separate terminal:
#   corepack pnpm dev

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Is Docker running?"
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is not running. Open Docker Desktop and try again." >&2
  exit 1
fi

echo "==> Dependencies (pnpm install)"
corepack pnpm install

echo "==> Starting Docker services (postgres, redis, minio)"
docker compose up -d postgres redis minio

echo "==> Waiting for Postgres to become ready"
for i in $(seq 1 30); do
  if docker exec bakimevi-postgres pg_isready -U bakim_user -d bakim_db >/dev/null 2>&1; then
    echo "    Postgres is ready."
    break
  fi
  if [[ "$i" == "30" ]]; then
    echo "ERROR: Postgres did not become ready within 30s." >&2
    exit 1
  fi
  sleep 1
done

echo "==> Generating Prisma client"
corepack pnpm db:generate

echo "==> Applying database schema (migrate deploy)"
corepack pnpm --filter @bakimevi/api exec prisma migrate deploy

echo "==> Loading seed data"
corepack pnpm db:seed

cat <<'DONE'

==================================================
Local environment is ready.

  Web:            http://localhost:3000
  API:           http://localhost:3001/health
  MinIO console:   http://localhost:9001  (minioadmin / minioadmin)

  Login:
    admin@carecenter.app / Admin123!
    john@carecenter.app  / Employee123!

Now start:
  corepack pnpm dev

To stop:
  docker compose down
==================================================
DONE
