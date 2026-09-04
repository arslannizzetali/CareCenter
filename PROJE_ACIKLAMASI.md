# Bu Proje Ne Yapıyor?

## Kısaca

**BakımEvi**, yaşlı ve engelli bireylere hizmet veren bakım merkezleri (huzurevi, engelli bakım evi vb.) için geliştirilmiş, **şirket içi (intranet)** kullanım amaçlı bir **hasta takip ve evrak yönetim sistemi**dir. İnternete açık genel kullanım için değil, tek bir kurumun kendi ağı içinde çalışacak şekilde tasarlanmıştır.

Basitçe: bir bakım merkezindeki personelin, o merkezde kalan hastaların/sakinlerin sağlık durumunu, verilen ilaçları, günlük bakım işlemlerini ve ilgili evrakları dijital olarak kayıt altına almasını sağlayan bir yönetim paneli.

## Kimler Kullanıyor?

Sistemde iki rol var:

- **Admin (Yönetici):** Çalışanları ekler/yönetir, tüm hastaları ve tüm güncellemeleri görür, audit (denetim) loglarını izler, evrak saklama politikalarını belirler.
- **Employee (Bakım Personeli):** Hasta kaydı oluşturur, hasta arar, hastaya günlük güncelleme girer (ilaç, bakım, gözlem vb.), kendi yüklediği evrakları indirir.

## Temel İşlevler

1. **Hasta Kaydı ve Takibi** — Ad, doğum tarihi, TC kimlik no (şifreli saklanır), oda numarası, bakım türü (yaşlı/engelli/ikisi), hareketlilik seviyesi (bağımsız/yardımlı/yatağa bağımlı), acil iletişim kişisi, alerjiler, süregelen ilaçlar gibi bilgiler tutulur.
2. **Günlük Güncellemeler** — Personel her hasta için ilaç verildi, bakım yapıldı, gözlem, durum değişikliği, vital bulgular (tansiyon, nabız, ateş vb.) veya olay/kaza kayıtları girer. Her kayıtta hastanın ruh hali (iyi/orta/kötü) ve "acil mi" işareti tutulur.
3. **Evrak Yönetimi** — Hastaya ait belgeler (PDF, görsel, Office dosyaları) yüklenir; önem derecesine göre üç kategoriye ayrılır:
   - `RED` (kritik) → hiç kimse silemez (kod seviyesinde korunur)
   - `YELLOW` (yarı önemli) → sadece admin silebilir, 90 gün varsayılan saklama
   - `GREEN` (standart) → sadece admin silebilir, 30 gün varsayılan saklama
   Dosyalar depolamaya (MinIO) yüklenmeden önce AES-256-GCM ile şifrelenir.
4. **Admin Paneli** — Çalışan yönetimi, tüm hastaların filtrelenmesi, son/acil güncellemeler paneli, audit log kayıtları, saklama politikası ayarları.
5. **Güvenlik** — JWT tabanlı giriş + refresh token rotation, Redis üzerinden brute-force koruması, bcrypt ile şifre hashleme, TC kimlik numarasının ve dosyaların şifreli saklanması, kritik işlemlerin audit log'a yazılması.

## Teknik Yapı

Proje bir **pnpm/Turbo monorepo**'dur:

- `apps/web` — Next.js 14 (App Router) + React 18 + TypeScript ile yazılmış kullanıcı arayüzü (giriş, hasta listesi/detayı, güncelleme formları, evrak yönetimi, admin paneli).
- `apps/api` — Node.js/Express + TypeScript backend. Kimlik doğrulama, hasta/güncelleme/evrak/admin uç noktaları, arka planda çalışan evrak saklama süreci (Bull queue), şifreleme ve audit servisleri burada.
- `packages/shared-types`, `packages/validation` — Frontend ile backend arasında paylaşılan TypeScript tipleri ve Zod doğrulama şemaları.
- **Veri katmanı:** PostgreSQL (Prisma ORM), Redis (rate limiting/oturum), MinIO (şifreli dosya depolama).
- `deploy/` altında Docker Compose ve Caddy tabanlı **çoklu kiracı (multi-tenant)** dağıtım yapılandırması bulunuyor — yani sistem, farklı bakım merkezleri (örn. `altinsaray`, `yenisaray`) için ayrı ayrı örneklenebilecek şekilde kurgulanmış.

## Özetle

Bu, tek bir bakım merkezinin kağıt üzerinde tuttuğu hasta dosyalarının, ilaç/bakım takip çizelgelerinin ve evrak arşivinin yerini alan; rol bazlı yetkilendirme, şifreleme ve denetim kaydı gibi güvenlik önlemleriyle güçlendirilmiş, kurum içi bir dijital sağlık/bakım takip yazılımıdır.
