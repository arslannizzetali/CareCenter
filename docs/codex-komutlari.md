# 🤖 CODEX AGENT KOMUT REHBERİ
## Bakım Merkezi WebApp — Hangi agent nasıl çalıştırılır?

---

## HIZLI BAŞLANGIÇ

```bash
# 1. Codex CLI kurulumu
npm install -g @openai/codex

# 2. ChatGPT hesabıyla giriş yap
codex

# 3. Proje dizinine gir
cd bakim-merkezi

# 4. İlk çalıştırma — Codex proje yapısını anlasın
codex "Bu projeyi anla ve AGENTS.md dosyalarını oku. Hangi teknolojiler kullanılıyor ve mimari nedir?"
```

---

## AGENT BAŞLATMA KOMUTLARI

### 🏭 System Agent (Root)
```bash
# Proje kökünden çalıştır — genel koordinasyon için
cd bakim-merkezi

# Yeni veri modeli ekle
codex "Customer entity'sine 'preferredLanguage' alanını ekle. 
       AGENTS.md'deki veri modeli formatına uy. 
       Prisma şeması, TypeScript tipi ve migration'ı güncelle."

# Proje durumu özeti al
codex "Projenin mevcut durumunu özetle: 
       hangi modüller tamamlandı, hangileri eksik, 
       sonraki adım ne olmalı?"

# Yeni modül scaffold oluştur
codex "Bildirim (Notification) modülü için tam scaffold oluştur:
       route, controller, service, Prisma modeli, Zod şeması.
       AGENTS.md'deki standartlara uy."
```

---

### 🔐 Security Agent
```bash
# Security dizininden veya --cd ile çalıştır
cd bakim-merkezi
codex --cd security \
  "Auth middleware'ini incele ve JWT validation'ını AGENTS.md standartlarına göre gözden geçir.
   Token rotation implementasyonunu kontrol et."

# Güvenlik audit'i
codex "Tüm API endpoint'lerini tara:
       1. RBAC middleware eksik olanları listele
       2. Input validation eksik olanları listele
       3. Rate limiting eksik olanları listele
       Her birini AGENTS.md güvenlik kontrol listesine göre değerlendir."

# Belirli güvenlik özelliği ekle
codex "Brute-force koruması için progressive delay ekle:
       1. deneme → 1s bekleme
       3. deneme → 5s bekleme
       5. deneme → 15 dakika ban
       Redis kullan, security/AGENTS.md'deki rate limit yapısına entegre et."

# Dependency güvenlik taraması
codex "npm audit çalıştır, kritik ve yüksek severity açıkları bul,
       güvenli versiyonlara güncelle, değişiklikleri belgele."

# CORS ve header kontrolü
codex "Mevcut CORS ve güvenlik header ayarlarını security/AGENTS.md 
       ile karşılaştır. Eksiklikleri düzelt."
```

---

### 🎨 UI Agent
```bash
# Web uygulama dizininden çalıştır
cd bakim-merkezi/apps/web
codex "Müşteri listesi sayfasını oluştur (app/customers/page.tsx):
       - DataTable bileşeni kullan
       - Arama, filtreleme, sayfalama
       - Yeni müşteri butonu
       - Responsive (mobile'da kart görünümü)
       apps/web/AGENTS.md bileşen standartlarına uy."

# Dashboard widget ekle
codex "Dashboard için 'Bugünkü Randevular' widget'ı oluştur:
       - Gerçek zamanlı güncelleme (SSE)
       - Teknisyen bazlı gruplandırma
       - Durum renk kodlaması
       AGENTS.md'deki renk paleti ve bileşen kurallarını kullan."

# Form bileşeni
codex "Araç kayıt formu oluştur (VehicleForm):
       - Türk plaka format validasyonu (otomatik büyük harf)
       - VIN validator (17 karakter, checksum)
       - Marka/model dropdown (bağımlı select)
       - React Hook Form + Zod
       apps/web/AGENTS.md form yönetimi kurallarına uy."

# Responsive düzeltme
codex "DataTable bileşenini incele:
       768px altında kart görünümüne geçecek şekilde güncelle.
       Tailwind responsive breakpoint'lerini kullan."

# Karanlık mod
codex "CustomerCard bileşenine dark mode desteği ekle.
       AGENTS.md'deki CSS değişkenlerini kullan, hard-coded renk kullanma."
```

---

### 🧪 Test Agent
```bash
# Test dizininden çalıştır
cd bakim-merkezi

# Unit test yaz
codex --cd tests \
  "AppointmentService için kapsamlı unit testler yaz:
   - checkConflict: çakışma var/yok/iptal edilmiş senaryolar
   - create: başarılı oluşturma/çakışma hatası/yetki hatası
   - statusChange: geçersiz durum geçişi kontrolü
   Vitest kullan, fixtures/index.ts'deki helper'ları kullan."

# Integration test
codex "POST /api/v1/invoices endpoint'i için integration testleri yaz:
       - Başarılı fatura oluşturma
       - KDV hesaplama doğruluğu
       - Yetkisiz erişim reddi
       - Geçersiz customerId durumu
       tests/integration/setup/ helper'larını kullan."

# E2E test
codex "Servis iş akışı için E2E test yaz (Playwright):
       araç teslim → servis başlat → parça ekle → tamamla → fatura oluştur
       Page Object Model kullan, tests/e2e/pages/ altına ekle."

# Coverage raporu al ve eksik testleri bul
codex "Test coverage raporunu çalıştır ve analiz et:
       %80 altındaki modülleri listele,
       en kritik eksik testleri önceliklendir,
       önce auth ve invoice modüllerini %95'e çıkar."

# Snapshot testleri
codex "CustomerCard bileşeni için snapshot test ekle.
       Farklı prop kombinasyonlarını test et (isSelected, farklı roller)."
```

---

### 🔬 Researcher Agent
```bash
# Research dizininden çalıştır
cd bakim-merkezi/research

# Kütüphane araştırması
codex "PDF oluşturma için kütüphane araştır:
       React-PDF vs Puppeteer vs PDFKit karşılaştır.
       Kriterler: Türkçe karakter, fatura tablo desteği, performans, bundle size.
       ADR formatında research/decisions/ADR-006-pdf-library.md oluştur."

# Takvim bileşeni araştır
codex "React takvim kütüphaneleri araştır:
       FullCalendar, React Big Calendar, @schedule-x, Schedule Master karşılaştır.
       Teknisyen bazlı resource view desteği önemli.
       ADR-010 oluştur."

# Performance araştırma
codex "Müşteri listesi sorgusunu analiz et:
       EXPLAIN ANALYZE çalıştır, index önerilerini belirle,
       N+1 sorunlarını tespit et.
       research/decisions/ADR-015-database-optimization.md oluştur."

# Güvenlik araştırma
codex "OWASP Top 10 için projeyi tara:
       Her maddeyi kontrol et, bulguları belgele,
       önceliklendirilmiş iyileştirme planı oluştur.
       research/decisions/ADR-016-security-audit.md'ye kaydet."

# KVKK uyum araştırması
codex "Projedeki kişisel veri işleme süreçlerini analiz et:
       KVKK 6698 gereksinimlerine göre uyum durumunu değerlendir,
       eksiklikleri listele, teknik çözüm öner."
```

---

## ÇOKLU AGENT KOORDİNASYONU

Büyük özellikler için birden fazla agent koordineli çalışır:

### Örnek: Yeni Randevu Modülü Ekleme
```bash
# 1. Researcher Agent — araştırma (önce)
codex "Randevu çakışma algoritması araştır: 
       interval tree vs segment tree vs PostgreSQL range type.
       ADR oluştur."

# 2. System Agent — veri modeli güncelle
codex "Appointment entity'sini AGENTS.md'ye ekle:
       tüm alanları, ilişkileri ve enum'ları tanımla."

# 3. Security Agent — güvenlik katmanı
codex "Randevu endpoint'leri için:
       RBAC kurallarını uygula (kim oluşturabilir/güncelleyebilir),
       input validation şemasını yaz,
       rate limiting ekle."

# 4. UI Agent — arayüz
codex "Randevu takvimi sayfasını oluştur:
       aylık görünüm, teknisyen filtreleme, yeni randevu modal'ı."

# 5. Test Agent — testler
codex "Randevu modülü için tam test suite yaz:
       unit (service), integration (API), E2E (user journey)."
```

---

## CODEX KULLANIM İPUÇLARI

### Approval Mode Seçimi
```bash
# Güvenli — her değişiklik için onay ister (önerilen başlangıç)
codex --approval-mode suggest "..."

# Yarı otomatik — dosyaları düzenler ama komut çalıştırmadan önce sorar
codex --approval-mode auto-edit "..."

# Tam otomatik — sandbox'ta kullan, production'da dikkatli ol
codex --approval-mode full-auto "..."
```

### Model Seçimi
```bash
# Hızlı görevler için (küçük düzeltmeler, basit eklentiler)
codex --model gpt-5.3-codex-spark "Basit bir yardımcı fonksiyon yaz"

# Karmaşık mimari görevler için (default)
codex --model gpt-5.3-codex "Karmaşık servis katmanını yeniden yaz"

# Oturum içinde model değiştir
# /model komutunu kullan
```

### Mevcut Durumu Kontrol Et
```bash
# Oturum içinde kullanım limitini gör
/status

# Mevcut çalışma dizinini gör
/pwd

# Bağlamı temizle (uzun oturumlarda)
/clear
```

### Paralel Görevler (Cloud)
```bash
# Birden fazla agent'ı paralel çalıştır
codex cloud "Hem unit testleri hem integration testleri paralel çalıştır"

# Farklı branch'lerde paralel geliştirme
codex cloud "feature/appointments branch'inde randevu modülünü tamamla 
             ve feature/inventory'de envanter modülünü geliştir"
```

### Dosya Yükleme
```bash
# Tasarım mockup'ı ile birlikte çalış
codex "Bu Figma screenshot'ına göre CustomerCard bileşenini güncelle" \
  --image mockup.png

# Mevcut kodu referans al
codex "Bu servis kodunu incele ve optimize et" \
  < apps/api/src/services/appointment.service.ts
```

---

## SIFIRDAN PROJE BAŞLATMA ADIM ADIM

```bash
# Adım 1: Proje oluştur
mkdir bakim-merkezi && cd bakim-merkezi
git init

# Adım 2: AGENTS.md dosyalarını oluştur
mkdir -p security tests research apps/web apps/api
# (Bu repodaki AGENTS.md dosyalarını kopyala)

# Adım 3: Codex ile proje scaffold oluştur
codex "AGENTS.md dosyalarını oku. 
       Tüm proje için tam scaffold oluştur:
       - pnpm workspace yapısı
       - Her app için package.json
       - TypeScript konfigürasyonları
       - Prisma şeması (AGENTS.md'deki veri modeline göre)
       - Docker Compose
       - GitHub Actions CI pipeline"

# Adım 4: Database kurulumu
codex "Prisma şemasını tüm entity'ler için oluştur.
       Migration dosyasını oluştur.
       Seed scripti yaz (geliştirme verisi)."

# Adım 5: Auth sistemi
codex --cd security \
  "JWT tabanlı auth sistemini security/AGENTS.md'ye göre implement et:
   login, logout, refresh token, token rotation."

# Adım 6: API endpoint'leri
codex "Müşteri CRUD API'sini AGENTS.md standartlarına göre yaz:
       route, controller, service, Zod validation."

# Adım 7: Frontend
cd apps/web
codex "Next.js App Router ile dashboard layout'unu oluştur.
       apps/web/AGENTS.md bileşen kataloğuna göre sidebar ve header'ı implement et."

# Adım 8: Testler
cd ../../tests
codex "Mevcut tüm servisler için unit test suite oluştur.
       Coverage %80'in üzerinde olmalı."
```

---

## SORUN GİDERME

```bash
# Codex context kaybettiyse
codex "AGENTS.md dosyalarını tekrar oku ve projenin mevcut durumunu özetle"

# Hata mesajı alıyorsan
codex "Bu hatayı incele ve düzelt: [hata mesajını yapıştır]"

# Test başarısız oluyorsa
codex "Bu testi başarısız yapan nedeni bul ve düzelt:
       [test çıktısını yapıştır]"

# Performans sorunu
codex "Bu endpoint yavaş çalışıyor. EXPLAIN ANALYZE ile incele ve optimize et:
       GET /api/v1/customers?search=ahmet"
```
