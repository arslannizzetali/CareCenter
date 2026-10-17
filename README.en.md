# BakımEvi — Care Facility Management System

> 🇹🇷 Türkçe sürüm: [README.tr.md](README.tr.md)

BakımEvi is an in-house resident tracking and document management system built for care facilities serving elderly and disabled residents (nursing homes, disability care homes, etc.). It is designed for intranet use within a single institution, not for general public internet access.

Throughout the interface the person receiving care is called **"Engelli"** (resident). The database model and API routes still use the name `patient` / `/patients` for backward compatibility; only the user-facing wording changed.

## Live Deployment

The system has been sold to a disability care facility and is running live at:

- Facility address: [https://merkez.bakimbilgisistemi.com](https://merkez.bakimbilgisistemi.com)
- The domain (`bakimbilgisistemi.com`) and the server belong to us (the BakımEvi team).

## Roles

- `ADMIN`: manages employees (create, **edit**, deactivate, soft-delete and **restore**), sees all residents and all updates, manages the **discharge archive** (restore or permanently delete archived residents), monitors audit logs, and sets document retention policies.
- `EMPLOYEE`: registers residents, searches residents, enters daily resident updates, edits or deletes **their own** updates, deletes a resident **once its status is Discharged**, and downloads documents they uploaded.

## Core Features

- Resident registration and record tracking
- Resident search by first name, last name, room number, and **exact national ID (TC, 11 digits)**
- **Filters:** status, care type, **under / over 65**, **disability type (physical / mental / both)** — the admin sees these without writing a query
- Medication, care, observation, vital signs, status change, and incident/accident updates
- Marking updates as urgent
- Resident mood tracking: good, medium, bad
- **Editing and deleting resident updates** (employees only their own; admin any)
- Document upload, download, prioritization, and retention policy
- **Document types** (fixed list, admin-managed) and a **document tracking matrix** (`/documents`): rows = residents, columns = types
- **Document expiry date** (calendar, or "unlimited"); an admin-panel notification **1 month before** expiry; remaining-time colour (≤ 1 month red, ≤ 3 months yellow, else green)
- **Print** button on the matrix — prints whatever the current filter shows
- **Notification centre:** bell icon in the header + `/admin/notifications`. On an expiry notification the admin can set a **new expiry date** from a calendar ("Yeni süre" — the notification clears itself if the new date is more than a month out) or **dismiss** it ("Tamam"); plus mark all read and manual scan
- Code-level delete protection for `RED` documents
- Employee management: create, **edit**, activate/deactivate, soft-delete, **view deleted employees and restore them**
- **Discharge-gated resident deletion**: a resident can only be deleted when its status is `DISCHARGED`; deletion is soft
- **Discharge archive** (`Taburcu Arşivi`): admin can restore an archived resident or permanently delete it (KVKK purge — removes the record, its updates, its documents, and the stored files)
- Admin panel, audit log, and recent updates
- AES-256-based encryption for national ID numbers and file contents
- JWT access tokens, refresh token rotation, and Redis-based brute-force protection

## System Flow

**1. Login** — Users sign in with email and password at `/login`. After a successful login, the dashboard and menus are shown based on the user's role.

Default seed users:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@carecenter.app` | `Admin123!` |
| Employee | `john@carecenter.app` | `Employee123!` |
| Employee | `emily@carecenter.app` | `Employee123!` |
| Employee | `michael@carecenter.app` | `Employee123!` |

**2. Resident Registration** — Both Admin and Employee roles can create new resident records at `/patients/new`, entering: full name, date of birth, gender, national ID number, room number, care type (`Yaşlı` / `Bedensel Engelli` / `Her İkisi`), mobility level (independent, assisted, or bedridden), emergency contact and phone, allergies, and ongoing medications.

The care type label `Bedensel Engelli` ("physically disabled") is intentionally distinct from the resident entity name ("Engelli") so the two are not confused.

The national ID number is encrypted on the API side before storage. After a successful registration, the user is redirected to the resident detail page.

**3. Resident Detail and Tracking** — The resident detail page shows resident information, emergency contact, allergies, ongoing medications, mobility status, updates, and documents together. Key actions:

- Adding new updates
- **Editing or deleting an existing update** from its card (employees see the controls only on their own updates; admins on all)
- Uploading and managing documents
- Viewing critical / semi-important / standard documents in separate lists
- Reviewing prior updates in chronological order
- **Deleting the resident** — the delete button is only enabled when the resident's status is `Taburcu` (Discharged); otherwise it is disabled with a hint to discharge first

**4. Entering / Editing a Resident Update** — New tracking entries are added at `/patients/:id/update`; an existing entry is edited at `/patients/:id/update/:updateId`.

Update types: medication given, care performed, observation, status changed, vital signs, incident/accident.

The update form opens extra fields depending on the selected type: medication name, dose, and route for medication entries; blood pressure, pulse, and temperature for vitals; bathing assistance, feeding assistance, physical therapy, wound care, psychological support, exercise, medication reminders, and clothing change for care entries. Every update also records the resident's mood and an urgent-status flag.

**5. Document Management** — Resident documents are uploaded at `/patients/:id/documents`. Supported file types are PDF, JPEG, PNG, WEBP, DOCX, and XLSX. On upload the user picks a **document type** (from the admin-managed fixed list) and either a **calendar expiry date** or "unlimited". An admin-panel notification is raised **1 month before** a document expires.

**Priority** (delete protection / retention):

| Priority | Meaning | Rule |
| --- | --- | --- |
| `RED` | Critical document | Cannot be deleted by anyone |
| `YELLOW` | Semi-important document | Admin can delete, default retention 90 days |
| `GREEN` | Standard document | Admin can delete, default retention 30 days |

**Remaining-time colour** (independent of priority, from the expiry date, computed server-side): ≤ 1 month red, ≤ 3 months yellow, longer green, expired red.

Files are encrypted with AES-256-GCM before being uploaded to MinIO. The database never stores the original file, plain-text national ID, or plain-text file key.

**5a. Document Tracking Matrix (`/documents`)** — "Evraklar" in the sidebar. Rows are residents, columns are document types. Each cell shows the remaining time + colour for that type's document; clicking an empty cell opens upload for that resident + type. Filters: search, status, care type, under/over 65, disability type, and **"missing document type X"**. A **Print** button prints the current filtered view with a heading describing the filter. The resident detail page carries the same information per type in an "Evrak Durumu" section, and an uploaded document's type + expiry date can be edited afterwards.

**6. Admin Panel** — The Admin role has access to:

- Employee list, employee creation, **employee editing** (name, email, role, active flag, password reset), and a **deleted-employees view with restore**
- Filtering all resident records, with a search box for name / surname / room / national ID
- The **discharge archive** (`Taburcu Arşivi`): soft-deleted residents, with **restore** and **permanent delete**
- Viewing all resident updates
- A panel for recent and urgent updates
- Audit log records
- Document retention policy settings

## Permission Matrix

| Action | Admin | Employee |
| --- | --- | --- |
| Create, list employees | Yes | No |
| Edit employees (incl. password reset) | Yes | No |
| Soft-delete an employee | Yes (not self) | No |
| View deleted employees and restore them | Yes | No |
| View all audit logs | Yes | No |
| View all resident updates | Yes | No |
| Create and view residents | Yes | Yes |
| Search residents (name / surname / room / TC) | Yes | Yes |
| Enter resident updates | Yes | Yes |
| View own updates | Yes | Yes |
| Edit / delete own resident update | Yes | Yes |
| Edit / delete any resident update | Yes | No |
| Delete a resident (status must be `DISCHARGED`) | Yes | Yes |
| Restore or permanently delete an archived resident | Yes | No |
| Upload documents | Yes | Yes |
| Download own uploaded documents | Yes | Yes |
| Download another employee's documents | Yes | No |
| Delete `RED` documents | No | No |
| Delete `YELLOW` / `GREEN` documents | Yes | No |
| Retention policy settings | Yes | No |

## Tech Stack

**Frontend:** Next.js 14 App Router, React 18, TypeScript 5, Tailwind CSS, TanStack Query, Zustand, React Hook Form + Zod, Lucide React

**Backend:** Node.js 20, Express, TypeScript, Prisma, PostgreSQL 16, Redis 7, Bull queue, MinIO, bcrypt, jsonwebtoken, Node.js crypto

**Monorepo:** pnpm workspace, Turbo

## Project Structure

```text
bakim-merkezi/
├── apps/
│   ├── web/                 # Next.js web frontend
│   └── api/                 # Express API and Prisma
├── packages/
│   ├── shared-types/        # Shared TypeScript types
│   └── validation/          # Zod validation schemas
├── docs/                    # Project documentation
├── tests/                   # Test routing and agent notes
├── security/                # Security notes
├── research/                # Research and decision notes
├── docker-compose.yml       # PostgreSQL, Redis, and MinIO
└── package.json             # Monorepo commands
```

## Requirements

- Node.js 20 LTS
- Corepack
- Docker Desktop
- pnpm, used via Corepack

## First-Time Setup

```bash
cd bakim-merkezi

corepack enable
corepack pnpm install
corepack pnpm generate:secrets

docker compose up -d

corepack pnpm db:generate
corepack pnpm --filter @bakimevi/api prisma db push
corepack pnpm db:seed

corepack pnpm dev
```

Application addresses:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- API health check: `http://localhost:3001/health`
- MinIO console: `http://localhost:9001`

## Daily Run

Once set up, day-to-day running usually only needs two commands:

```bash
docker compose up -d
corepack pnpm dev
```

The terminal running `corepack pnpm dev` must stay open. Closing it stops the web and API processes.

## Resetting the Local Environment

If the Docker volume or database gets reset, re-apply the schema and seed data:

```bash
docker compose up -d
corepack pnpm db:generate
corepack pnpm --filter @bakimevi/api prisma db push
corepack pnpm db:seed
corepack pnpm dev
```

> If TypeScript reports `Property 'demoRequest' does not exist on type 'PrismaClient'` (or a similar missing-model error), the Prisma client is stale — run `corepack pnpm db:generate` once.

## Testing and Validation

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

For API integration tests:

```bash
RUN_INTEGRATION=true corepack pnpm --filter @bakimevi/api test
```

## API Summary

**Auth:** `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`

**Employees (admin only):** `GET /api/v1/users`, `POST /api/v1/users`, `GET /api/v1/users/:id`, `PATCH /api/v1/users/:id`, `DELETE /api/v1/users/:id`, `POST /api/v1/users/:id/restore`

**Residents:** `GET /api/v1/patients` (supports `search` by name / surname / room / 11-digit TC), `POST /api/v1/patients`, `GET /api/v1/patients/:id`, `PATCH /api/v1/patients/:id`, `DELETE /api/v1/patients/:id` (only when status is `DISCHARGED`), `POST /api/v1/patients/:id/updates`, `GET /api/v1/patients/:id/updates`, `PATCH /api/v1/patients/:id/updates/:updateId`, `DELETE /api/v1/patients/:id/updates/:updateId`, `POST /api/v1/patients/:id/documents`, `GET /api/v1/patients/:id/documents`

**Documents:** `GET /api/v1/documents/matrix` (resident filters + `missingTypeId`), `GET /api/v1/documents/:id/download`, `PATCH /api/v1/documents/:id/priority`, `PATCH /api/v1/documents/:id/meta` (type + expiry date), `DELETE /api/v1/documents/:id`, `GET /api/v1/patients/:id/documents/status`

**Document types:** `GET /api/v1/document-types`, and `POST` / `PATCH /:id` / `DELETE /:id` (admin)

**Notifications (admin):** `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `POST /api/v1/notifications/read-all`, `POST /api/v1/notifications/scan`, `POST /api/v1/notifications/:id/read`, `DELETE /api/v1/notifications/:id`

**Admin:** `GET /api/v1/admin/dashboard-stats`, `GET /api/v1/admin/recent-updates`, `GET /api/v1/admin/audit-logs`, `GET /api/v1/admin/patients`, `GET /api/v1/admin/patients/deleted`, `POST /api/v1/admin/patients/:id/restore`, `DELETE /api/v1/admin/patients/:id/permanent`, `GET /api/v1/admin/retention-policies`, `PATCH /api/v1/admin/retention-policies`

## Security Notes

- All critical inputs are validated with Zod.
- Passwords are hashed with bcrypt cost 12.
- National ID numbers are stored encrypted; search matches them by deterministic exact-match, never in plain text.
- Documents are encrypted before being uploaded to MinIO.
- `RED` documents cannot be deleted at the service level.
- A resident can only be deleted after it has been discharged; the delete is soft.
- Permanent resident deletion (KVKK purge) cascades to the resident's updates, documents, and stored files, and is written to the audit log as `PATIENT_PURGED`.
- An admin cannot delete their own account.
- Critical operations are written to the audit log.
- Refresh token rotation is applied.
- Redis-based brute-force login protection is applied.
- Stack traces are not shown to users in production.

## Development Notes

This project is designed for in-house use. If public deployment, a custom domain, email/SMS integration, or formal compliance with data protection regulations is planned, an additional security and operational review should be carried out.
