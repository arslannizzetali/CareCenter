#!/bin/bash
# =============================================================
# CareCenter — Codex Agent Setup Command Reference File
# Run this file to create the project structure
# =============================================================

echo "🏗️  Creating CareCenter project structure..."

# ─────────────────────────────────────────────
# 1. PROJECT ROOT DIRECTORY
# ─────────────────────────────────────────────
mkdir -p bakim-merkezi
cd bakim-merkezi

# ─────────────────────────────────────────────
# 2. FULL DIRECTORY STRUCTURE
# ─────────────────────────────────────────────
mkdir -p \
  apps/web/src/{app,components,lib,hooks,types} \
  apps/api/src/{routes,controllers,middleware,models,services,utils,config} \
  packages/{shared-types,ui-components,validation}/src \
  tests/{e2e/{fixtures,pages,specs},integration/{setup,auth,customers,appointments,invoices,inventory}} \
  security \
  research/{decisions,benchmarks,prototypes} \
  docs/{api,architecture,database} \
  scripts

echo "✅ Directory structure created"

# ─────────────────────────────────────────────
# 3. CREATE AGENTS.md FILES
# ─────────────────────────────────────────────

# Root AGENTS.md (System Agent) — main coordinator
cat > AGENTS.md << 'SYSTEM_AGENT_EOF'
# Paste the AGENTS.md content here (System Agent)
SYSTEM_AGENT_EOF

# Security Agent
cat > security/AGENTS.md << 'SECURITY_AGENT_EOF'
# Paste the security/AGENTS.md content here
SECURITY_AGENT_EOF

# UI Agent
mkdir -p apps/web
cat > apps/web/AGENTS.md << 'UI_AGENT_EOF'
# Paste the apps/web/AGENTS.md content here
UI_AGENT_EOF

# Test Agent
cat > tests/AGENTS.md << 'TEST_AGENT_EOF'
# Paste the tests/AGENTS.md content here
TEST_AGENT_EOF

# Researcher Agent
cat > research/AGENTS.md << 'RESEARCH_AGENT_EOF'
# Paste the research/AGENTS.md content here
RESEARCH_AGENT_EOF

echo "✅ AGENTS.md files created"

# ─────────────────────────────────────────────
# 4. PROJECT STARTER FILES
# ─────────────────────────────────────────────

# pnpm workspace
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
.env.*.local
*.log
.DS_Store
coverage/
reports/
.next/
prisma/migrations/dev.db
EOF

# .env.example
cat > .env.example << 'EOF'
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/bakim_db"
TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/bakim_test"
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="minimum-32-karakter-guclu-secret-key-buraya"
JWT_REFRESH_SECRET="farkli-bir-minimum-32-karakter-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# CORS
ALLOWED_ORIGINS="http://localhost:3000,https://yourdomain.com"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="noreply@bakimpro.com"

# SMS (Netgsm)
NETGSM_USERNAME=""
NETGSM_PASSWORD=""
NETGSM_SENDER="BAKIMPRO"

# File Storage (MinIO)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="bakim-files"
S3_REGION="us-east-1"

# App
NODE_ENV="development"
API_PORT=3001
FRONTEND_URL="http://localhost:3000"
API_URL="http://localhost:3001"

# Monitoring
SENTRY_DSN=""
EOF

echo "✅ Base configuration files created"

# ─────────────────────────────────────────────
# 5. DOCKER COMPOSE
# ─────────────────────────────────────────────
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: bakim_postgres
    environment:
      POSTGRES_DB: bakim_db
      POSTGRES_USER: bakim_user
      POSTGRES_PASSWORD: bakim_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bakim_user -d bakim_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgres_test:
    image: postgres:16-alpine
    container_name: bakim_postgres_test
    environment:
      POSTGRES_DB: bakim_test
      POSTGRES_USER: bakim_user
      POSTGRES_PASSWORD: bakim_pass
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data  # Run the test DB in RAM (for speed)

  redis:
    image: redis:7-alpine
    container_name: bakim_redis
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: bakim_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

volumes:
  postgres_data:
  redis_data:
  minio_data:
EOF

echo "✅ Docker Compose created"

# ─────────────────────────────────────────────
# 6. TURBO (MONOREPO BUILD TOOL)
# ─────────────────────────────────────────────
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["^build"],
      "outputs": ["reports/**"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
EOF

echo "✅ Turbo configuration created"

# ─────────────────────────────────────────────
# 7. ROOT PACKAGE.JSON
# ─────────────────────────────────────────────
cat > package.json << 'EOF'
{
  "name": "bakim-merkezi",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "test:unit": "vitest run",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "db:migrate": "pnpm --filter api prisma migrate dev",
    "db:migrate:test": "DATABASE_URL=$TEST_DATABASE_URL pnpm --filter api prisma migrate deploy",
    "db:seed": "pnpm --filter api tsx scripts/seed.ts",
    "db:studio": "pnpm --filter api prisma studio",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "@playwright/test": "^1.44.0",
    "@faker-js/faker": "^8.4.0",
    "prettier": "^3.3.0",
    "eslint": "^8.57.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
EOF

echo "✅ Root package.json created"

echo ""
echo "════════════════════════════════════════════════"
echo "  CareCenter setup complete!"
echo "════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. cp .env.example .env"
echo "  2. Edit the .env file"
echo "  3. pnpm install"
echo "  4. pnpm docker:up"
echo "  5. pnpm db:migrate"
echo "  6. pnpm db:seed"
echo "  7. pnpm dev"
echo ""
