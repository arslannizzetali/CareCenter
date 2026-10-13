# BakımEvi — Bakım Merkezi Yönetim Sistemi

> 🇬🇧 English version: [README.en.md](README.en.md)

BakımEvi, yaşlı ve engelli bireylere hizmet veren bakım merkezleri için geliştirilmiş şirket içi engelli takip ve evrak yönetim sistemidir. Uygulama intranet kullanımı için tasarlanmıştır; doğrudan internete açık çalıştırılması önerilmez.

Arayüzde bakım verilen kişi **"Engelli"** olarak adlandırılır. Veritabanı modeli ve API yolları geriye dönük uyumluluk için hâlâ `patient` / `/patients` adını kullanır; yalnızca kullanıcıya görünen metinler değişti.

## Canlı Kurulum

Sistem bir engelli bakım merkezine satılmıştır ve aşağıdaki adreste canlı olarak kullanılmaktadır:

- Kurum adresi: [https://merkez.bakimbilgisistemi.com](https://merkez.bakimbilgisistemi.com)
- Domain (`bakimbilgisistemi.com`) ve sunucu bize (BakımEvi ekibine) aittir.

## Roller

Sistem iki temel kullanıcı rolüne göre çalışır:

- `ADMIN`: çalışanları yönetir (oluşturma, **düzenleme**, pasife alma, silme ve **geri getirme**); tüm engellileri ve tüm güncellemeleri görür; **taburcu arşivini** yönetir (arşivdeki engelliyi geri getirir veya kalıcı olarak siler); audit loglarını izler ve evrak saklama ayarlarını yapar.
- `EMPLOYEE`: engelli kaydı oluşturur, engelli arar, günlük engelli güncellemesi girer, **kendi** güncellemesini düzenler veya siler, durumu **"Taburcu" olan** bir engelliyi siler ve kendi yüklediği evrakları indirir.

## Temel Özellikler

- Engelli kaydı oluşturma ve engelli bilgilerini takip etme
- Ad, soyad, oda numarası ve **birebir TC kimlik numarası (11 hane)** ile engelli arama
- **Filtreler:** durum, bakım türü, **65 yaş altı / üstü**, **engel türü (Fiziksel / Zihinsel / Her İkisi)** — admin sorgu yazmadan görür
- İlaç, bakım, gözlem, vital bulgu, durum değişikliği ve olay/kaza güncellemeleri
- Acil güncelleme işaretleme
- Engelli ruh hali takibi: iyi, orta, kötü
- **Engelli güncellemelerini düzenleme ve silme** (çalışan yalnızca kendi kaydını; admin hepsini)
- Evrak yükleme, indirme, önceliklendirme ve saklama politikası
- **Evrak geçerlilik süresi** (ay bazında veya sınırsız); süre dolmadan **1 ay önce** admin paneline bildirim
- **Bildirim merkezi:** header'daki zil ikonu + `/admin/notifications` sayfası. Süresi dolan evrak bildiriminde admin **"Yeni süre"** ile takvimden yeni geçerlilik tarihi atar (tarih 1 aydan uzaksa bildirim otomatik kalkar) veya **"Tamam"** ile bildirimi kaldırır. Ayrıca: tümünü okundu yap, elle tarama.
- `RED` evraklar için kod seviyesinde silme koruması
- Çalışan yönetimi: oluşturma, **düzenleme**, aktif/pasif yapma, silme, **silinen çalışanları görüntüleme ve geri getirme**
- **Taburcu şartına bağlı engelli silme**: bir engelli yalnızca durumu `DISCHARGED` (Taburcu) iken silinebilir; silme işlemi soft-delete'tir
- **Taburcu Arşivi**: admin, arşivdeki engelliyi geri getirebilir veya kalıcı olarak silebilir (KVKK imhası — kayıt, güncellemeleri, evrakları ve depodaki dosyaları kaldırır)
- Admin paneli, audit log ve son güncellemeler
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

### 2. Engelli Kaydı Oluşturma

Admin ve çalışan rolleri `/patients/new` sayfasından yeni engelli kaydı oluşturabilir. Girilen bilgiler:

- Ad ve soyad
- Doğum tarihi
- Cinsiyet
- TC kimlik numarası
- Oda numarası
- Bakım türü: `Yaşlı`, `Bedensel Engelli` veya `Her İkisi`
- Hareketlilik seviyesi: bağımsız, yardımlı veya yatağa bağımlı
- Acil iletişim kişisi ve telefonu
- Alerjiler
- Süregelen ilaçlar

`Bedensel Engelli` bakım türü etiketi, engelli varlık adı ("Engelli") ile karışmaması için bilinçli olarak ayrı tutulmuştur.

TC kimlik numarası girilirse API tarafında şifrelenerek saklanır. Kayıt başarılı olunca kullanıcı otomatik olarak engelli detay sayfasına yönlendirilir.

### 3. Engelli Detay ve Takip

Engelli detay sayfasında engelli bilgileri, acil iletişim, alerjiler, süregelen ilaçlar, hareketlilik durumu, güncellemeler ve evraklar birlikte görülür.

Detay ekranındaki temel işlemler:

- Yeni güncelleme ekleme
- Mevcut bir güncellemeyi kartı üzerinden **düzenleme veya silme** (çalışan bu butonları yalnızca kendi güncellemelerinde görür; admin hepsinde)
- Engelli evrakı yükleme ve yönetme
- Kritik, yarı önemli ve standart evrakları ayrı listelerde görüntüleme
- Önceki güncellemeleri zaman sırası ile takip etme
- **Engelliyi silme** — silme butonu yalnızca engellinin durumu `Taburcu` iken aktiftir; aksi hâlde pasif olur ve "önce taburcu edin" ipucu gösterilir

### 4. Güncelleme Girme / Düzenleme

Yeni takip kaydı `/patients/:id/update` sayfasından girilir; mevcut bir kayıt `/patients/:id/update/:updateId` sayfasından düzenlenir.

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
- Her güncellemede engelli ruh hali ve acil durum işareti tutulur.

### 5. Evrak Yönetimi

Engelli evrakları `/patients/:id/documents` sayfasından yüklenir. Desteklenen dosya tipleri PDF, JPEG, PNG, WEBP, DOCX ve XLSX. Yüklerken:

- **Evrak türü** seçilir (sabit liste — "Engelli Sağlık Raporu", "Kimlik Fotokopisi", "Vasi / Vekâlet Kararı" vb.; admin **Ayarlar → Evrak Türleri**'nden düzenler).
- **Geçerlilik bitiş tarihi** takvimden girilir veya "Süresiz" seçilir. Süre dolmadan **1 ay önce** admin paneline bildirim düşer.

**Öncelik** (silme koruması / saklama):

| Öncelik | Anlam | Kural |
| --- | --- | --- |
| `RED` | Kritik evrak | Hiçbir kullanıcı silemez |
| `YELLOW` | Yarı önemli evrak | Admin silebilir, varsayılan saklama 90 gün |
| `GREEN` | Standart evrak | Admin silebilir, varsayılan saklama 30 gün |

**Kalan süre rengi** (önceliğinden bağımsız, bitiş tarihine göre): **≤ 1 ay kırmızı**, **≤ 3 ay sarı**, fazlası yeşil, dolmuşsa kırmızı. Sunucu tarafında hesaplanır, her ekranda tutarlıdır.

Dosyalar MinIO'ya yüklenmeden önce AES-256-GCM ile şifrelenir. Veritabanında orijinal dosya, plain-text TC veya plain-text dosya anahtarı tutulmaz.

### 5a. Evrak Takip Matrisi (`/documents`)

Kenar menüden **"Evraklar"**. Satır = engelli, sütun = evrak türü. Her hücrede o türdeki evrakın **kalan süresi + rengi**; boş hücreye tıklayınca o engelli + tür için yükleme açılır.

- Filtreler: arama, durum, bakım türü, **65 yaş altı / üstü**, **engel türü**, ve **"… evrakı olmayanlar"** (eksik evrak).
- **Yazdır** butonu: o anki filtreyi başlıkla birlikte basar (ör. *65 yaş altı + Engelli Sağlık Raporu olmayanlar*).
- Engelli detay sayfasında **"Evrak Durumu"** bölümü aynı bilgiyi tür bazında gösterir; eksik olanı oradan da yükleyebilirsin.
- Yüklü evrakın tür + geçerlilik tarihi sonradan düzenlenebilir (evrak listesinde kalem ikonu).

### 6. Admin Paneli

Admin rolü şu alanlara erişir:

- Çalışan listesi, yeni çalışan oluşturma, **çalışan düzenleme** (ad, e-posta, rol, aktiflik, şifre sıfırlama) ve **silinen çalışanlar görünümü + geri getirme**
- Tüm engelli kayıtlarını filtreleme; ad / soyad / oda / TC için arama kutusu
- **Taburcu Arşivi**: soft-delete edilmiş engelliler; **geri getirme** ve **kalıcı silme**
- Tüm engelli güncellemelerini görüntüleme
- Son güncellemeler ve acil güncellemeler paneli
- Audit log kayıtları
- Evrak saklama politikası ayarları

## Yetki Matrisi

| İşlem | Admin | Çalışan |
| --- | --- | --- |
| Çalışan oluşturma, listeleme | Var | Yok |
| Çalışan düzenleme (şifre sıfırlama dahil) | Var | Yok |
| Çalışanı silme | Var (kendisi hariç) | Yok |
| Silinen çalışanları görme ve geri getirme | Var | Yok |
| Tüm audit logları görme | Var | Yok |
| Tüm engelli güncellemelerini görme | Var | Yok |
| Engelli oluşturma ve görüntüleme | Var | Var |
| Engelli arama (ad / soyad / oda / TC) | Var | Var |
| Engelli güncellemesi girme | Var | Var |
| Kendi güncellemelerini görme | Var | Var |
| Kendi güncellemesini düzenleme / silme | Var | Var |
| Herhangi bir güncellemeyi düzenleme / silme | Var | Yok |
| Engelli silme (durum `DISCHARGED` olmalı) | Var | Var |
| Arşivdeki engelliyi geri getirme / kalıcı silme | Var | Yok |
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

> TypeScript `Property 'demoRequest' does not exist on type 'PrismaClient'` (veya benzeri "model bulunamadı") hatası verirse Prisma client bayattır — bir kez `corepack pnpm db:generate` çalıştırın.

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

Çalışan (yalnızca admin):

- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id`
- `DELETE /api/v1/users/:id`
- `POST /api/v1/users/:id/restore`

Engelli:

- `GET /api/v1/patients` (`search` ile ad / soyad / oda / 11 haneli TC araması)
- `POST /api/v1/patients`
- `GET /api/v1/patients/:id`
- `PATCH /api/v1/patients/:id`
- `DELETE /api/v1/patients/:id` (yalnızca durum `DISCHARGED` iken)
- `POST /api/v1/patients/:id/updates`
- `GET /api/v1/patients/:id/updates`
- `PATCH /api/v1/patients/:id/updates/:updateId`
- `DELETE /api/v1/patients/:id/updates/:updateId`
- `POST /api/v1/patients/:id/documents`
- `GET /api/v1/patients/:id/documents`

Evrak:

- `GET /api/v1/documents/matrix` (evrak matrisi; engelli filtreleri + `missingTypeId`)
- `GET /api/v1/documents/:id/download`
- `PATCH /api/v1/documents/:id/priority`
- `PATCH /api/v1/documents/:id/meta` (tür + geçerlilik tarihi)
- `DELETE /api/v1/documents/:id`
- `GET /api/v1/patients/:id/documents/status` (tür bazında durum)
- `POST /api/v1/patients/:id/documents` (`documentTypeId`, `expiresAt` alanlarıyla)

Evrak Türleri:

- `GET /api/v1/document-types`
- `POST /api/v1/document-types` · `PATCH /api/v1/document-types/:id` · `DELETE /api/v1/document-types/:id` (admin)

Bildirimler (admin):

- `GET /api/v1/notifications` · `GET /api/v1/notifications/unread-count`
- `POST /api/v1/notifications/read-all` · `POST /api/v1/notifications/scan`
- `POST /api/v1/notifications/:id/read` · `DELETE /api/v1/notifications/:id`

Admin:

- `GET /api/v1/admin/dashboard-stats`
- `GET /api/v1/admin/recent-updates`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/patients`
- `GET /api/v1/admin/patients/deleted`
- `POST /api/v1/admin/patients/:id/restore`
- `DELETE /api/v1/admin/patients/:id/permanent`
- `GET /api/v1/admin/retention-policies`
- `PATCH /api/v1/admin/retention-policies`

## Güvenlik Notları

- Tüm kritik girdiler Zod ile doğrulanır.
- Şifreler bcrypt cost 12 ile hashlenir.
- TC kimlik numarası şifreli saklanır; arama, düz metinle değil deterministik birebir eşleşme ile yapılır.
- Evraklar MinIO'ya şifrelenerek yüklenir.
- `RED` evraklar servis seviyesinde silinemez.
- Bir engelli yalnızca taburcu edildikten sonra silinebilir; silme işlemi soft-delete'tir.
- Kalıcı engelli silme (KVKK imhası) engellinin güncellemelerini, evraklarını ve depodaki dosyalarını da kaldırır ve audit log'a `PATIENT_PURGED` olarak yazılır.
- Admin kendi hesabını silemez.
- Kritik işlemler audit log'a yazılır.
- Refresh token rotation uygulanır.
- Redis üzerinden brute-force giriş koruması uygulanır.
- Production ortamında stack trace kullanıcıya gösterilmez.

## Geliştirme Notları

Bu proje şirket içi kullanım senaryosu için tasarlanmıştır. Public deployment, domain, e-posta/SMS entegrasyonu veya KVKK kapsamlı resmi uyum süreci planlanıyorsa ayrıca güvenlik ve operasyonel gözden geçirme yapılmalıdır.
