# BakımEvi — Care Facility Management System

<div align="center">

[🇬🇧 English](#english) &nbsp;|&nbsp; [🇹🇷 Türkçe](#türkçe)

</div>

---

<a id="english"></a>

## English

BakımEvi is an in-house patient tracking and document management system built for care facilities serving elderly and disabled residents (nursing homes, disability care homes, etc.). It is designed for intranet use within a single institution, not for general public internet access.

### Live Deployment

The system has been sold to a disability care facility and is running live at:

- Facility address: [https://merkez.bakimbilgisistemi.com](https://merkez.bakimbilgisistemi.com)
- The domain (`bakimbilgisistemi.com`) and the server belong to us (the BakımEvi team).

### Roles

- `ADMIN`: manages employees, sees all patients and all updates, monitors audit logs, and sets document retention policies.
- `EMPLOYEE`: registers patients, searches patients, enters daily patient updates, and downloads documents they uploaded.

### Core Features

- Patient registration and record tracking
- Patient search, filtering, and quick access by room number
- Medication, care, observation, vital signs, status change, and incident/accident updates
- Marking updates as urgent
- Patient mood tracking: good, medium, bad
- Document upload, download, prioritization, and retention policy
- Code-level delete protection for `RED` documents
- Admin panel, employee management, audit log, and recent updates
- AES-256-based encryption for national ID numbers and file contents
- JWT access tokens, refresh token rotation, and Redis-based brute-force protection

### System Flow

**1. Login** — Users sign in with email and password at `/login`. After a successful login, the dashboard and menus are shown based on the user's role.

Default seed users:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@bakimevi.com` | `Admin123!` |
| Employee | `ahmet@bakimevi.com` | `Calisan123!` |
| Employee | `mehmet@bakimevi.com` | `Calisan123!` |
| Employee | `fatma@bakimevi.com` | `Calisan123!` |

**2. Patient Registration** — Both Admin and Employee roles can create new patient records at `/patients/new`, entering: full name, date of birth, gender, national ID number, room number, care type (elderly, disabled, or both), mobility level (independent, assisted, or bedridden), emergency contact and phone, allergies, and ongoing medications.

The national ID number is encrypted on the API side before storage. After a successful registration, the user is redirected to the patient detail page.

**3. Patient Detail and Tracking** — The patient detail page shows patient information, emergency contact, allergies, ongoing medications, mobility status, updates, and documents together. Key actions include adding new updates, uploading and managing documents, viewing critical/semi-important/standard documents in separate lists, and reviewing prior updates in chronological order.

**4. Entering a Patient Update** — New tracking entries are added at `/patients/:id/update`.

Update types: medication given, care performed, observation, status changed, vital signs, incident/accident.

The update form opens extra fields depending on the selected type: medication name, dose, and route for medication entries; blood pressure, pulse, and temperature for vitals; bathing assistance, feeding assistance, physical therapy, wound care, psychological support, exercise, medication reminders, and clothing change for care entries. Every update also records the patient's mood and an urgent-status flag.

**5. Document Management** — Patient documents are uploaded at `/patients/:id/documents`. Supported file types are PDF, JPEG, PNG, WEBP, DOCX, and XLSX.

Document priorities:

| Priority | Meaning | Rule |
| --- | --- | --- |
| `RED` | Critical document | Cannot be deleted by anyone |
| `YELLOW` | Semi-important document | Admin can delete, default retention 90 days |
| `GREEN` | Standard document | Admin can delete, default retention 30 days |

Files are encrypted with AES-256-GCM before being uploaded to MinIO. The database never stores the original file, plain-text national ID, or plain-text file key.

**6. Admin Panel** — The Admin role has access to: employee list and creation, filtering all patient records, viewing all patient updates, a panel for recent and urgent updates, audit log records, and document retention policy settings.

### Permission Matrix

| Action | Admin | Employee |
| --- | --- | --- |
| Create, delete, list employees | Yes | No |
| View all audit logs | Yes | No |
| View all patient updates | Yes | No |
| Create and view patients | Yes | Yes |
| Enter patient updates | Yes | Yes |
| View own updates | Yes | Yes |
| Upload documents | Yes | Yes |
| Download own uploaded documents | Yes | Yes |
| Download another employee's documents | Yes | No |
| Delete `RED` documents | No | No |
| Delete `YELLOW`/`GREEN` documents | Yes | No |
| Retention policy settings | Yes | No |

### Tech Stack

**Frontend:** Next.js 14 App Router, React 18, TypeScript 5, Tailwind CSS, TanStack Query, Zustand, React Hook Form + Zod, Lucide React

**Backend:** Node.js 20, Express, TypeScript, Prisma, PostgreSQL 16, Redis 7, Bull queue, MinIO, bcrypt, jsonwebtoken, Node.js crypto

**Monorepo:** pnpm workspace, Turbo

### Project Structure

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

### Requirements

- Node.js 20 LTS
- Corepack
- Docker Desktop
- pnpm, used via Corepack

### First-Time Setup

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

### Daily Run

Once set up, day-to-day running usually only needs two commands:

```bash
docker compose up -d
corepack pnpm dev
```

The terminal running `corepack pnpm dev` must stay open. Closing it stops the web and API processes.

### Resetting the Local Environment

If the Docker volume or database gets reset, re-apply the schema and seed data:

```bash
docker compose up -d
corepack pnpm db:generate
corepack pnpm --filter @bakimevi/api prisma db push
corepack pnpm db:seed
corepack pnpm dev
```

### Testing and Validation

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

For API integration tests:

```bash
RUN_INTEGRATION=true corepack pnpm --filter @bakimevi/api test
```

### API Summary

**Auth:** `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`

**Patients:** `GET /api/v1/patients`, `POST /api/v1/patients`, `GET /api/v1/patients/:id`, `PATCH /api/v1/patients/:id`, `DELETE /api/v1/patients/:id`, `POST /api/v1/patients/:id/updates`, `GET /api/v1/patients/:id/updates`, `POST /api/v1/patients/:id/documents`, `GET /api/v1/patients/:id/documents`

**Documents:** `GET /api/v1/documents/:id/download`, `PATCH /api/v1/documents/:id/priority`, `DELETE /api/v1/documents/:id`

**Admin:** `GET /api/v1/admin/dashboard-stats`, `GET /api/v1/admin/recent-updates`, `GET /api/v1/admin/audit-logs`, `GET /api/v1/admin/retention-policies`, `PATCH /api/v1/admin/retention-policies`

### Security Notes

- All critical inputs are validated with Zod.
- Passwords are hashed with bcrypt cost 12.
- National ID numbers are stored encrypted.
- Documents are encrypted before being uploaded to MinIO.
- `RED` documents cannot be deleted at the service level.
- Critical operations are written to the audit log.
- Refresh token rotation is applied.
- Redis-based brute-force login protection is applied.
- Stack traces are not shown to users in production.

### Development Notes

This project is designed for in-house use. If public deployment, a custom domain, email/SMS integration, or formal compliance with data protection regulations is planned, an additional security and operational review should be carried out.

---

<a id="türkçe"></a>

## Türkçe

BakımEvi, yaşlı ve engelli bireylere hizmet veren bakım merkezleri için geliştirilmiş şirket içi hasta takip ve evrak yönetim sistemidir. Uygulama intranet kullanımı için tasarlanmıştır; doğrudan internete açık çalıştırılması önerilmez.

### Canlı Kurulum

Sistem bir engelli bakım merkezine satılmıştır ve aşağıdaki adreste canlı olarak kullanılmaktadır:

- Kurum adresi: [https://merkez.bakimbilgisistemi.com](https://merkez.bakimbilgisistemi.com)
- Domain (`bakimbilgisistemi.com`) ve sunucu bize (BakımEvi ekibine) aittir.

Sistem iki temel kullanıcı rolüne göre çalışır:

- `ADMIN`: çalışanları, tüm hastaları, tüm güncellemeleri, audit loglarını ve evrak saklama ayarlarını yönetir.
- `EMPLOYEE`: hasta kaydı oluşturur, hasta arar, hasta güncellemesi girer ve kendi yüklediği evrakları indirir.

### Temel Özellikler

- Hasta kaydı oluşturma ve hasta bilgilerini takip etme
- Hasta arama, filtreleme ve oda numarasına göre hızlı erişim
- İlaç, bakım, gözlem, vital bulgu, durum değişikliği ve olay/kaza güncellemeleri
- Acil hasta güncellemesi işaretleme
- Hasta ruh hali takibi: iyi, orta, kötü
- Evrak yükleme, indirme, önceliklendirme ve saklama politikası
- `RED` evraklar için kod seviyesinde silme koruması
- Admin paneli, çalışan yönetimi, audit log ve son güncellemeler
- TC kimlik numarası ve dosya içeriği için AES-256 tabanlı şifreleme
- JWT access token, refresh token rotation ve Redis tabanlı brute-force koruması

### Sistem Akışı

#### 1. Giriş

Kullanıcı `/login` sayfasından e-posta ve şifre ile giriş yapar. Başarılı girişten sonra rolüne göre dashboard ve menüler gösterilir.

Varsayılan seed kullanıcıları:

| Rol | E-posta | Şifre |
| --- | --- | --- |
| Admin | `admin@bakimevi.com` | `Admin123!` |
| Çalışan | `ahmet@bakimevi.com` | `Calisan123!` |
| Çalışan | `mehmet@bakimevi.com` | `Calisan123!` |
| Çalışan | `fatma@bakimevi.com` | `Calisan123!` |

#### 2. Hasta Kaydı Oluşturma

Admin ve çalışan rolleri yeni hasta kaydı oluşturabilir.

Uygulamada `/patients/new` sayfasından şu bilgiler girilir:

- Ad ve soyad
- Doğum tarihi
- Cinsiyet
- TC kimlik numarası
- Oda numarası
- Bakım türü: yaşlı, engelli veya her ikisi
- Hareketlilik seviyesi: bağımsız, yardımlı veya yatağa bağımlı
- Acil iletişim kişisi ve telefonu
- Alerjiler
- Süregelen ilaçlar

TC kimlik numarası girilirse API tarafında şifrelenerek saklanır. Hasta kaydı başarılı olunca kullanıcı otomatik olarak hasta detay sayfasına yönlendirilir.

#### 3. Hasta Detay ve Takip

Hasta detay sayfasında hasta bilgileri, acil iletişim, alerjiler, süregelen ilaçlar, hareketlilik durumu, hasta güncellemeleri ve evraklar birlikte görülür.

Hasta detay ekranındaki temel işlemler:

- Yeni hasta güncellemesi ekleme
- Hasta evrakı yükleme ve yönetme
- Kritik, yarı önemli ve standart evrakları ayrı listelerde görüntüleme
- Hastaya ait önceki güncellemeleri zaman sırası ile takip etme

#### 4. Hasta Güncellemesi Girme

`/patients/:id/update` sayfasından hasta için yeni takip kaydı girilir.

Güncelleme türleri:

- İlaç verildi
- Bakım yapıldı
- Gözlem
- Durum değişti
- Vital bulgular
- Olay/kaza

Güncelleme formu, seçilen türe göre ek alanlar açar:

- İlaç kaydında ilaç adı, doz ve uygulama yolu girilir.
- Vital bulgularda tansiyon, nabız ve ateş girilebilir.
- Bakım kaydında banyo yardımı, beslenme yardımı, fizik tedavi, yara bakımı, psikolojik destek, egzersiz, ilaç hatırlatma ve kıyafet değişimi seçilebilir.
- Her güncellemede hasta ruh hali ve acil durum işareti tutulur.

#### 5. Evrak Yönetimi

Hasta evrakları `/patients/:id/documents` sayfasından yüklenir. Desteklenen dosya tipleri PDF, JPEG, PNG, WEBP, DOCX ve XLSX formatlarıdır.

Evrak öncelikleri:

| Öncelik | Anlam | Kural |
| --- | --- | --- |
| `RED` | Kritik evrak | Hiçbir kullanıcı silemez |
| `YELLOW` | Yarı önemli evrak | Admin silebilir, varsayılan saklama 90 gün |
| `GREEN` | Standart evrak | Admin silebilir, varsayılan saklama 30 gün |

Dosyalar MinIO'ya yüklenmeden önce AES-256-GCM ile şifrelenir. Veritabanında orijinal dosya, plain-text TC veya plain-text dosya anahtarı tutulmaz.

#### 6. Admin Paneli

Admin rolü şu alanlara erişir:

- Çalışan listesi ve yeni çalışan oluşturma
- Tüm hasta kayıtlarını filtreleme
- Tüm hasta güncellemelerini görüntüleme
- Son güncellemeler ve acil güncellemeler paneli
- Audit log kayıtları
- Evrak saklama politikası ayarları

### Yetki Matrisi

| İşlem | Admin | Çalışan |
| --- | --- | --- |
| Çalışan oluşturma, silme, listeleme | Var | Yok |
| Tüm audit logları görme | Var | Yok |
| Tüm hasta güncellemelerini görme | Var | Yok |
| Hasta oluşturma ve görüntüleme | Var | Var |
| Hasta güncellemesi girme | Var | Var |
| Kendi güncellemelerini görme | Var | Var |
| Evrak yükleme | Var | Var |
| Kendi yüklediği evrakı indirme | Var | Var |
| Başka çalışanın evrakını indirme | Var | Yok |
| `RED` evrak silme | Yok | Yok |
| `YELLOW` ve `GREEN` evrak silme | Var | Yok |
| Retention policy ayarları | Var | Yok |

### Teknoloji Stack

Frontend:

- Next.js 14 App Router
- React 18
- TypeScript 5
- Tailwind CSS
- TanStack Query
- Zustand
- React Hook Form ve Zod
- Lucide React

Backend:

- Node.js 20
- Express
- TypeScript
- Prisma
- PostgreSQL 16
- Redis 7
- Bull queue
- MinIO
- bcrypt
- jsonwebtoken
- Node.js crypto

Monorepo:

- pnpm workspace
- Turbo

### Proje Yapısı

```text
bakim-merkezi/
├── apps/
│   ├── web/                 # Next.js web arayüzü
│   └── api/                 # Express API ve Prisma
├── packages/
│   ├── shared-types/        # Paylaşılan TypeScript tipleri
│   └── validation/          # Zod validasyon şemaları
├── docs/                    # Proje dokümantasyonu
├── tests/                   # Test yönlendirmeleri ve ajan notları
├── security/                # Güvenlik notları
├── research/                # Araştırma ve karar notları
├── docker-compose.yml       # PostgreSQL, Redis ve MinIO
└── package.json             # Monorepo komutları
```

### Gereksinimler

- Node.js 20 LTS
- Corepack
- Docker Desktop
- pnpm, Corepack üzerinden kullanılır

### İlk Kurulum

Projeyi ilk kez çalıştırırken:

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

Uygulama adresleri:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- API health check: `http://localhost:3001/health`
- MinIO console: `http://localhost:9001`

### Günlük Çalıştırma

Kurulum tamamlandıysa günlük çalıştırma için genellikle iki komut yeterlidir:

```bash
docker compose up -d
corepack pnpm dev
```

`corepack pnpm dev` çalışan terminal açık kalmalıdır. Terminal kapatılırsa web ve API süreçleri de kapanır.

### Lokal Ortamı Sıfırlama

Docker volume veya veritabanı sıfırlandıysa tekrar şema ve seed verisi basmak için:

```bash
docker compose up -d
corepack pnpm db:generate
corepack pnpm --filter @bakimevi/api prisma db push
corepack pnpm db:seed
corepack pnpm dev
```

### Test ve Doğrulama

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

API entegrasyon testleri için:

```bash
RUN_INTEGRATION=true corepack pnpm --filter @bakimevi/api test
```

### API Özeti

Auth:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

Hasta:

- `GET /api/v1/patients`
- `POST /api/v1/patients`
- `GET /api/v1/patients/:id`
- `PATCH /api/v1/patients/:id`
- `DELETE /api/v1/patients/:id`
- `POST /api/v1/patients/:id/updates`
- `GET /api/v1/patients/:id/updates`
- `POST /api/v1/patients/:id/documents`
- `GET /api/v1/patients/:id/documents`

Evrak:

- `GET /api/v1/documents/:id/download`
- `PATCH /api/v1/documents/:id/priority`
- `DELETE /api/v1/documents/:id`

Admin:

- `GET /api/v1/admin/dashboard-stats`
- `GET /api/v1/admin/recent-updates`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/retention-policies`
- `PATCH /api/v1/admin/retention-policies`

### Güvenlik Notları

- Tüm kritik girdiler Zod ile doğrulanır.
- Şifreler bcrypt cost 12 ile hashlenir.
- TC kimlik numarası şifreli saklanır.
- Evraklar MinIO'ya şifrelenerek yüklenir.
- `RED` evraklar servis seviyesinde silinemez.
- Kritik işlemler audit log'a yazılır.
- Refresh token rotation uygulanır.
- Redis üzerinden brute-force giriş koruması uygulanır.
- Production ortamında stack trace kullanıcıya gösterilmez.

### Geliştirme Notları

Bu proje şirket içi kullanım senaryosu için tasarlanmıştır. Public deployment, domain, e-posta/SMS entegrasyonu veya KVKK kapsamlı resmi uyum süreci planlanıyorsa ayrıca güvenlik ve operasyonel gözden geçirme yapılmalıdır.
