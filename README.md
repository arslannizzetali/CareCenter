# BakımEvi Hasta Bakım Merkezi Yönetim Sistemi

BakımEvi, yaşlı ve engelli bireylere hizmet veren bakım merkezleri için geliştirilmiş şirket içi hasta takip ve evrak yönetim sistemidir. Uygulama intranet kullanımı için tasarlanmıştır; doğrudan internete açık çalıştırılması önerilmez.

## Canlı Kurulum

Sistem bir engelli bakım merkezine satılmıştır ve aşağıdaki adreste canlı olarak kullanılmaktadır:

- Kurum adresi: [https://merkez.bakimbilgisistemi.com](https://merkez.bakimbilgisistemi.com)
- Domain (`bakimbilgisistemi.com`) ve sunucu bize (BakımEvi ekibine) aittir.

Sistem iki temel kullanıcı rolüne göre çalışır:

- `ADMIN`: çalışanları, tüm hastaları, tüm güncellemeleri, audit loglarını ve evrak saklama ayarlarını yönetir.
- `EMPLOYEE`: hasta kaydı oluşturur, hasta arar, hasta güncellemesi girer ve kendi yüklediği evrakları indirir.

## Temel Özellikler

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

## Sistem Akışı

### 1. Giriş

Kullanıcı `/login` sayfasından e-posta ve şifre ile giriş yapar. Başarılı girişten sonra rolüne göre dashboard ve menüler gösterilir.

Varsayılan seed kullanıcıları:

| Rol | E-posta | Şifre |
| --- | --- | --- |
| Admin | `admin@bakimevi.com` | `Admin123!` |
| Çalışan | `ahmet@bakimevi.com` | `Calisan123!` |
| Çalışan | `mehmet@bakimevi.com` | `Calisan123!` |
| Çalışan | `fatma@bakimevi.com` | `Calisan123!` |

### 2. Hasta Kaydı Oluşturma

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

### 3. Hasta Detay ve Takip

Hasta detay sayfasında hasta bilgileri, acil iletişim, alerjiler, süregelen ilaçlar, hareketlilik durumu, hasta güncellemeleri ve evraklar birlikte görülür.

Hasta detay ekranındaki temel işlemler:

- Yeni hasta güncellemesi ekleme
- Hasta evrakı yükleme ve yönetme
- Kritik, yarı önemli ve standart evrakları ayrı listelerde görüntüleme
- Hastaya ait önceki güncellemeleri zaman sırası ile takip etme

### 4. Hasta Güncellemesi Girme

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

### 5. Evrak Yönetimi

Hasta evrakları `/patients/:id/documents` sayfasından yüklenir. Desteklenen dosya tipleri PDF, JPEG, PNG, WEBP, DOCX ve XLSX formatlarıdır.

Evrak öncelikleri:

| Öncelik | Anlam | Kural |
| --- | --- | --- |
| `RED` | Kritik evrak | Hiçbir kullanıcı silemez |
| `YELLOW` | Yarı önemli evrak | Admin silebilir, varsayılan saklama 90 gün |
| `GREEN` | Standart evrak | Admin silebilir, varsayılan saklama 30 gün |

Dosyalar MinIO'ya yüklenmeden önce AES-256-GCM ile şifrelenir. Veritabanında orijinal dosya, plain-text TC veya plain-text dosya anahtarı tutulmaz.

### 6. Admin Paneli

Admin rolü şu alanlara erişir:

- Çalışan listesi ve yeni çalışan oluşturma
- Tüm hasta kayıtlarını filtreleme
- Tüm hasta güncellemelerini görüntüleme
- Son güncellemeler ve acil güncellemeler paneli
- Audit log kayıtları
- Evrak saklama politikası ayarları

## Yetki Matrisi

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

## Teknoloji Stack

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

## Proje Yapısı

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

## Gereksinimler

- Node.js 20 LTS
- Corepack
- Docker Desktop
- pnpm, Corepack üzerinden kullanılır

## İlk Kurulum

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

## Günlük Çalıştırma

Kurulum tamamlandıysa günlük çalıştırma için genellikle iki komut yeterlidir:

```bash
docker compose up -d
corepack pnpm dev
```

`corepack pnpm dev` çalışan terminal açık kalmalıdır. Terminal kapatılırsa web ve API süreçleri de kapanır.

## Lokal Ortamı Sıfırlama

Docker volume veya veritabanı sıfırlandıysa tekrar şema ve seed verisi basmak için:

```bash
docker compose up -d
corepack pnpm db:generate
corepack pnpm --filter @bakimevi/api prisma db push
corepack pnpm db:seed
corepack pnpm dev
```

## Test ve Doğrulama

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

API entegrasyon testleri için:

```bash
RUN_INTEGRATION=true corepack pnpm --filter @bakimevi/api test
```

## API Özeti

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

## Güvenlik Notları

- Tüm kritik girdiler Zod ile doğrulanır.
- Şifreler bcrypt cost 12 ile hashlenir.
- TC kimlik numarası şifreli saklanır.
- Evraklar MinIO'ya şifrelenerek yüklenir.
- `RED` evraklar servis seviyesinde silinemez.
- Kritik işlemler audit log'a yazılır.
- Refresh token rotation uygulanır.
- Redis üzerinden brute-force giriş koruması uygulanır.
- Production ortamında stack trace kullanıcıya gösterilmez.

## Geliştirme Notları

Bu proje şirket içi kullanım senaryosu için tasarlanmıştır. Public deployment, domain, e-posta/SMS entegrasyonu veya KVKK kapsamlı resmi uyum süreci planlanıyorsa ayrıca güvenlik ve operasyonel gözden geçirme yapılmalıdır.
