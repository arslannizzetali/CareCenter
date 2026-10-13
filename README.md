# CareCenter — Care Center Management System

In-house patient tracking and document management system for elderly and disability care facilities.

Staff record daily care updates (medications, vital signs, observations, incidents), manage documents with priority and retention rules, and — optionally — generate an AI shift-handover summary. All sensitive personal data is encrypted at rest, every critical action is audit-logged, and no patient-identifying data ever leaves the API when the AI feature is used.

## Documentation

| Language | File |
| --- | --- |
| 🇬🇧 English | **[README.en.md](README.en.md)** |
| 🇹🇷 Türkçe | **[README.tr.md](README.tr.md)** |

See the English file for setup, roles, the permission matrix, the API summary, and security notes.

## Tech stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TanStack Query, Zustand
- **Backend:** Node.js 20, Express, Prisma, PostgreSQL, Redis
- **Storage:** MinIO (S3-compatible), AES-256-GCM encryption for files and national IDs
- **AI:** Pluggable LLM provider (local Ollama or Claude) with a fail-secure anonymization layer

## Quick start

```bash
corepack pnpm install
cp .env.example .env   # then fill in the secrets
corepack pnpm generate:secrets
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm dev
```

The web app runs on http://localhost:3000 and the API on http://localhost:3001.
