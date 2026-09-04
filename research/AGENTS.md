# 🔬 RESEARCHER AGENT — Bakım Merkezi WebApp
## research/AGENTS.md | Codex Research Specialist

---

## AGENT KİMLİĞİ

**Rol:** Researcher Agent  
**Sorumluluk:** Teknoloji araştırması, kütüphane değerlendirmesi, best practices, mimari kararlar, performans optimizasyonu  
**Çalışma Dizini:** `research/`, `docs/`  
**Çıktı Formatı:** Her araştırma `research/decisions/ADR-XXX-konu.md` olarak belgelenir

---

## TEMEL GÖREVLER

1. **Library Değerlendirme** — Yeni kütüphane eklemeden önce alternatifleri karşılaştır
2. **Mimari Karar Kayıtları (ADR)** — Önemli tasarım kararlarını belgeye dök
3. **Performance Araştırması** — Darboğazları tespit et, optimizasyon öner
4. **Güvenlik Araştırması** — CVE takibi, güvenli kodlama pratikleri
5. **API Tasarımı** — RESTful best practices, versiyonlama stratejileri
6. **Database Optimizasyonu** — Query optimizasyonu, index stratejisi
7. **Otomasyon Araştırması** — CI/CD, deployment, monitoring

---

## ARAŞTIRMA ÇIKTISI FORMATI

Her araştırma bu ADR (Architecture Decision Record) şablonunu kullanmalı:

```markdown
# ADR-001: [Karar Başlığı]

**Durum:** [Önerilen | Kabul Edildi | Reddedildi | Değiştirildi]  
**Tarih:** YYYY-MM-DD  
**Kararı Alan:** Researcher Agent + [onaylayan]

## Bağlam

Neden bu karar alınması gerekti? Mevcut durum nedir?

## Değerlendirilen Seçenekler

### Seçenek A: [İsim]
**Artıları:**
- 

**Eksileri:**
-

**Benchmark/Veri:**
-

### Seçenek B: [İsim]
...

## Karar

Hangi seçenek seçildi ve neden?

## Sonuçlar

Bu kararın etkileri nelerdir? Trade-off'lar neler?

## Referanslar

- [Link]
```

---

## MEVCUT MİMARİ KARARLAR

### ADR-001: State Management Stratejisi

**Durum:** Kabul Edildi | **Tarih:** 2025-01-01

**Karar:** Sunucu state için TanStack Query, client state için Zustand kullanılır.

**Değerlendirilen Seçenekler:**

| Kriter | Redux Toolkit | Zustand + TanStack Q | Jotai + TanStack Q |
|--------|--------------|---------------------|-------------------|
| Bundle size | ~30KB | ~8KB | ~6KB |
| Boilerplate | Yüksek | Düşük | Düşük |
| DevTools | Mükemmel | İyi | Orta |
| Öğrenme eğrisi | Yüksek | Düşük | Orta |
| Cache yönetimi | Manuel | Otomatik (TQ) | Otomatik (TQ) |
| Seçildi? | ❌ | ✅ | ❌ |

**Gerekçe:** TanStack Query sunucu state'ini mükemmel yönetiyor (cache, invalidation, optimistic updates). Zustand geri kalan UI state için yeterli ve minimal.

---

### ADR-002: ORM Seçimi

**Durum:** Kabul Edildi | **Tarih:** 2025-01-01

**Karar:** Prisma ORM kullanılır.

| Kriter | Prisma | TypeORM | Drizzle | Knex |
|--------|--------|---------|---------|------|
| Type safety | Mükemmel | İyi | Mükemmel | Zayıf |
| Migration sistemi | Mükemmel | İyi | Manuel | Manuel |
| Query builder | İyi | İyi | Mükemmel | Mükemmel |
| Performans | İyi | İyi | Mükemmel | Mükemmel |
| Ekosistem | Büyük | Büyük | Büyüyen | Orta |
| Öğrenme eğrisi | Düşük | Orta | Orta | Düşük |
| Seçildi? | ✅ | ❌ | ❌ | ❌ |

**Gerekçe:** Prisma'nın otomatik type generation'ı ve migration sistemi geliştirici verimliliğini artırıyor. Drizzle daha performanslı ama ekosistem henüz olgunlaşmamış.

---

### ADR-003: Dosya Depolama Stratejisi

**Durum:** Kabul Edildi | **Tarih:** 2025-01-01

**Karar:** Self-hosted MinIO (S3-compatible API)

| Kriter | AWS S3 | MinIO (self) | Cloudinary | Local Disk |
|--------|--------|-------------|------------|------------|
| Maliyet | Kullanım bazlı | Sunucu maliyeti | Kullanım bazlı | Sıfır |
| S3 uyumluluğu | Native | Tam uyumlu | Kısmi | Yok |
| Görsel optimizasyon | Ek servis | Sharp ile | Dahili | Manuel |
| Yerelleştirme (KVKK) | AWS EU | Yerel | Yurt dışı | Yerel |
| Vendor lock-in | Yüksek | Yok | Yüksek | Yok |
| Seçildi? | ❌ | ✅ | ❌ | ❌ |

**Gerekçe:** KVKK uyumu için veriler yurt içinde kalmalı. MinIO S3 API'si sayesinde ileride AWS S3'e geçiş kolay.

---

### ADR-004: Gerçek Zamanlı Bildirimler

**Durum:** Kabul Edildi | **Tarih:** 2025-01-01

**Karar:** Server-Sent Events (SSE) kullanılır. WebSocket'e geçiş yolu açık bırakılır.

| Kriter | WebSocket | SSE | Long Polling | Polling |
|--------|-----------|-----|-------------|---------|
| Çift yönlü | ✅ | ❌ (tek yön) | ❌ | ❌ |
| Kurulum karmaşıklığı | Yüksek | Düşük | Orta | Çok düşük |
| Proxy uyumluluğu | Sorunlu | İyi | İyi | Mükemmel |
| Reconnect otomatik | Manuel | Otomatik | Manuel | N/A |
| HTTP/2 | Sorunlu | Mükemmel | İyi | İyi |
| Seçildi? | ❌ | ✅ | ❌ | ❌ |

**Gerekçe:** Dashboard güncellemeleri ve bildirimler için tek yönlü veri akışı yeterli. SSE tarayıcı tarafında otomatik yeniden bağlanma sağlıyor, kurulumu basit.

---

## ARAŞTIRMA YAPILACAKLAR LİSTESİ

Bu agent aşağıdaki konuları araştırmalı ve ADR oluşturmalıdır:

### Yüksek Öncelik
- [ ] **ADR-005:** SMS servis sağlayıcısı seçimi (Netgsm vs Mutlucell vs İleti.gs)
- [ ] **ADR-006:** PDF oluşturma kütüphanesi (Puppeteer vs PDFKit vs React-PDF)
- [ ] **ADR-007:** E-posta template sistemi (React Email vs MJML vs Handlebars)
- [ ] **ADR-008:** Full-text arama stratejisi (PostgreSQL FTS vs Elasticsearch vs Typesense)

### Orta Öncelik
- [ ] **ADR-009:** Plaka sorgulama API'si araştırması
- [ ] **ADR-010:** Takvim bileşeni değerlendirmesi (FullCalendar vs React Big Calendar vs özel)
- [ ] **ADR-011:** Raporlama/export stratejisi (XLSX, CSV, PDF)
- [ ] **ADR-012:** Monitoring stack (Sentry vs Datadog vs kendi Grafana stack'i)

### Düşük Öncelik
- [ ] **ADR-013:** Caching stratejisi (Redis vs Vercel KV vs Upstash)
- [ ] **ADR-014:** Feature flag sistemi

---

## ARAŞTIRMA YÖNTEMİ

Bu agent araştırma yaparken şu adımları izler:

### 1. Gereksinim Analizi
```markdown
Araştırma başlamadan önce yanıtlanacak sorular:
- Bu özellik ne sıklıkla kullanılacak?
- Performans gereksinimleri neler?
- Güvenlik gereksinimleri var mı?
- KVKK veya yasal gereklilik var mı?
- Mevcut stack ile uyumlu mu?
- Team'in bu teknolojiyle deneyimi var mı?
- Uzun vadeli maintainability nasıl?
```

### 2. Alternatif Keşif
```bash
# npm trends araştırması
# https://npmtrends.com/package-a-vs-package-b

# Bundle size kontrolü
# https://bundlephobia.com/package/package-name

# GitHub aktivitesi
# Son commit tarihi, issue sayısı, PR merge hızı

# Güvenlik geçmişi
npm audit --json | jq '.vulnerabilities'
npx better-npm-audit audit
```

### 3. Benchmark Yapma
```typescript
// Kütüphane performans testi şablonu
// research/benchmarks/pdf-generation.bench.ts
import { bench, describe } from 'vitest';

describe('PDF Generation Benchmark', () => {
  bench('Puppeteer - basit fatura', async () => {
    // Test kodu
  }, { time: 1000 });

  bench('PDFKit - basit fatura', async () => {
    // Test kodu
  }, { time: 1000 });

  bench('React-PDF - basit fatura', async () => {
    // Test kodu
  }, { time: 1000 });
});

// Çalıştır: pnpm vitest bench research/benchmarks/pdf-generation.bench.ts
```

### 4. Prototip Oluşturma
```
Her araştırma için minimal prototip:
research/
└── prototypes/
    └── ADR-XXX-konu/
        ├── README.md       ← Bulgular
        ├── index.ts        ← Prototip kod
        └── results.md      ← Benchmark sonuçları
```

---

## PDF OLUŞTURMA ARAŞTIRMASI (ADR-006 Taslak)

### Gereksinimler
- Fatura PDF'i (logo, tablo, imza alanı)
- Servis raporu PDF'i
- A4 boyut, Türkçe karakter desteği
- Sunucu taraflı rendering (SSR)
- Hız: <2 saniye basit fatura için

### Değerlendirme

#### React-PDF (`@react-pdf/renderer`)
```typescript
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const InvoicePDF = ({ invoice }: { invoice: Invoice }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>FATURA</Text>
        <Text>No: {invoice.invoiceNumber}</Text>
      </View>
      {/* ... */}
    </Page>
  </Document>
);

// ✅ Artıları:
// - React sözdizimi — öğrenmesi kolay
// - TypeScript desteği
// - Türkçe karakter desteği (font embed)
// - Node.js + tarayıcıda çalışır

// ❌ Eksileri:
// - CSS subset (flex bazlı)
// - Karmaşık tablo desteği sınırlı
// - Büyük bundle (~2MB)
```

#### Puppeteer
```typescript
import puppeteer from 'puppeteer';

async function generatePDF(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return pdf;
}

// ✅ Artıları:
// - Tam CSS desteği
// - Pixel-perfect rendering
// - HTML/CSS bilgisiyle yapılabilir

// ❌ Eksileri:
// - Chromium bağımlılığı (~300MB)
// - Yüksek memory kullanımı
// - Yavaş başlangıç (~2-3s)
// - Serverless'ta sorunlu
```

#### PDFKit
```typescript
import PDFDocument from 'pdfkit';

function generateInvoicePDF(invoice: Invoice): Buffer {
  const doc = new PDFDocument({ size: 'A4' });
  doc.font('fonts/NotoSans-Regular.ttf'); // Türkçe için
  doc.text(`Fatura No: ${invoice.invoiceNumber}`, 50, 50);
  // ...
  return doc.read();
}

// ✅ Artıları:
// - Çok hafif (~1MB)
// - Hızlı (<100ms)
// - Düşük memory

// ❌ Eksileri:
// - Manuel layout hesaplama
// - Tablo desteği yok (manuel)
// - Öğrenmesi zor
```

### Öneri (Taslak)
**React-PDF** öneriliyor:
- Ekip React biliyor → hızlı geliştirme
- Türkçe karakter için NotoSans font embed et
- Tablo için `@react-pdf/renderer` TableView kullan
- Node.js'de `renderToStream` ile streaming PDF

---

## TAKVİM BİLEŞENİ ARAŞTIRMASI (ADR-010 Taslak)

### Değerlendirilen Seçenekler

| Özellik | FullCalendar | React Big Calendar | @schedule-x | Özel |
|---------|-------------|-------------------|-------------|------|
| Türkçe desteği | ✅ | ✅ | ✅ | Manuel |
| Drag & Drop | ✅ | ✅ | ✅ | Zor |
| Resource view | ✅ Pro | ❌ | ✅ | Zor |
| Bundle size | ~150KB | ~45KB | ~60KB | Minimal |
| Ücretsiz? | Kısmi | ✅ | ✅ | ✅ |
| Tailwind uyumu | ❌ | Kısmi | ✅ | ✅ |
| TypeScript | ✅ | ✅ | ✅ | ✅ |

**Neden resource view önemli?**
Teknisyen bazlı takvim görünümü:
```
         | Ahmet T. | Mehmet K. | Ayşe D. |
09:00    | Yağ değ. |           | Fren    |
10:00    |          | Akü kont. |         |
11:00    | Lastik   |           |         |
```
Bu görünüm için FullCalendar Pro veya @schedule-x gerekli.

**Öneri:** @schedule-x (ücretsiz, resource view, Tailwind uyumlu)

---

## PERFORMANS ARAŞTIRMA PLANI

Bu agent aşağıdaki performans konularını araştırmalı:

### Database Query Optimizasyonu
```sql
-- Araştırılacak sorgular:

-- 1. Müşteri listesi (pagination ile)
-- N+1 sorununu önlemek için:
SELECT c.*, 
       COUNT(v.id) as vehicle_count,
       MAX(a.scheduled_at) as last_appointment
FROM customers c
LEFT JOIN vehicles v ON v.customer_id = c.id
LEFT JOIN appointments a ON a.customer_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id
ORDER BY c.created_at DESC
LIMIT 20 OFFSET 0;

-- Bu sorgu için gerekli index'ler:
CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX idx_customers_created_at ON customers(created_at DESC) 
  WHERE deleted_at IS NULL;

-- 2. Randevu çakışma kontrolü (sık çalışan kritik sorgu)
CREATE INDEX idx_appointments_conflict ON appointments(technician_id, scheduled_at)
  WHERE status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL;

-- 3. Düşük stok alarmı
CREATE INDEX idx_parts_low_stock ON parts(current_stock, minimum_stock)
  WHERE is_active = true;
```

### API Response Cache Stratejisi
```typescript
// Araştırılacak cache stratejileri:

// 1. Redis cache (mevcut seçim)
// TTL stratejisi:
const CACHE_TTL = {
  customerList: 60,        // 1 dakika (sık değişir)
  partsList: 300,          // 5 dakika
  dashboardStats: 120,     // 2 dakika
  technicianList: 3600,    // 1 saat (nadiren değişir)
  serviceTypes: 86400,     // 24 saat (statik veri)
};

// Cache invalidation stratejisi:
// - Müşteri güncellenince → customerList cache'ini temizle
// - Randevu oluşturulunca → dashboardStats'ı temizle
// - Parça stok değişince → partsList ve düşük stok cache'ini temizle
```

---

## GÜVENLİK ARAŞTIRMA PLANI

### OWASP Top 10 Uyumu Kontrol Listesi
```
A01: Broken Access Control
  [ ] RBAC implementasyonu doğrulandı
  [ ] Horizontal privilege escalation test edildi
  [ ] API endpoint'leri authz middleware ile korunuyor

A02: Cryptographic Failures
  [ ] TLS 1.2+ zorunlu
  [ ] Şifreler bcrypt cost factor 12+ ile hashlenıyor
  [ ] JWT secret'lar minimum 256-bit

A03: Injection
  [ ] Tüm DB sorguları parametrize
  [ ] Input validation (Zod) her endpoint'te
  [ ] NoSQL injection (Redis) önlendi

A04: Insecure Design
  [ ] Threat modeling yapıldı
  [ ] Rate limiting aktif
  [ ] Fail-secure prensibi uygulandı

A05: Security Misconfiguration
  [ ] Default credential'lar değiştirildi
  [ ] Debug mod production'da kapalı
  [ ] Gereksiz HTTP metodları kapalı

A06: Vulnerable Components
  [ ] npm audit otomatik CI'da
  [ ] Dependabot aktif
  [ ] License kontrolü yapılıyor

A07: Auth Failures
  [ ] Token rotation uygulandı
  [ ] Brute force koruması var
  [ ] Session fixation önlendi

A08: Software Integrity Failures
  [ ] npm package lock.json commit'lendi
  [ ] CI/CD pipeline imzalı

A09: Logging Failures
  [ ] Audit log aktif
  [ ] Kritik olaylar alerte düşüyor
  [ ] Log'lar hassas veri içermiyor

A10: SSRF
  [ ] Dış URL fetch'leri beyaz listede
  [ ] Webhook URL'leri doğrulanıyor
```

---

## KVKK ARAŞTIRMASI

### Türkiye KVKK Gereksinimleri (6698 sayılı Kanun)

Bu proje müşteri kişisel verisi işlediği için KVKK uyumu zorunludur.

**Kişisel Veri Kategorileri (projede):**
- Kimlik verisi: ad, soyad, TC kimlik (gerekirse)
- İletişim verisi: e-posta, telefon, adres
- Araç verisi: plaka, VIN
- İşlem verisi: servis kayıtları, faturalar

**Teknik Gereksinimler:**

```typescript
// 1. Veri minimizasyonu — sadece gerekli veriyi topla
// ❌ YANLIŞ — gerekmeyen veri
interface Customer {
  tcKimlik: string;     // Gerekli mi? Değilse alma!
  birthDate: Date;      // Servis için gerekli mi?
}

// ✅ DOĞRU — minimal veri
interface Customer {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  // Sadece servis için zorunlu olanlar
}

// 2. Açık rıza kaydı
interface ConsentRecord {
  customerId: string;
  consentType: 'marketing' | 'data_processing' | 'sms';
  givenAt: Date;
  ipAddress: string;
  withdrawnAt?: Date;
}

// 3. Veri silme hakkı (unutulma hakkı)
async function deleteCustomerData(customerId: string): Promise<void> {
  // Soft delete değil — gerçek anonymization
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      firstName: 'ANONYMIZED',
      lastName: 'ANONYMIZED',
      email: `deleted-${customerId}@anonymized.invalid`,
      phone: '0000000000',
      deletedAt: new Date(),
    },
  });
  // Servis kayıtlarını koru (mali kayıt zorunluluğu)
  // Ancak kişisel bilgileri anonymize et
}

// 4. Veri taşınabilirlik (data portability)
async function exportCustomerData(customerId: string): Promise<CustomerDataExport> {
  // Müşterinin kendi verilerini JSON olarak dışa aktar
}
```

**Araştırılacak Konular:**
- [ ] VERBİS kaydı gereksinimleri
- [ ] Kişisel veri saklama süreleri (servis kayıtları için yasal minimum)
- [ ] Veri ihlali bildirim süreci (72 saat kuralı)
- [ ] Açık rıza formu tasarımı
- [ ] Çerez politikası gereksinimleri

---

## CODEX NOTLARI

Bu agent çalışırken:

1. Her karar için `research/decisions/ADR-XXX.md` oluştur
2. Kararlar proje root `AGENTS.md`'deki veri modellerini etkiliyorsa System Agent'a bildir
3. Güvenlik kararları Security Agent ile koordineli alınmalı
4. Benchmark'ları `research/benchmarks/` klasöründe sakla
5. **Hiçbir production kodu yazma** — sadece prototipler ve belgeler
6. npm paket eklemeden önce `npm audit` ve bundle size kontrolü yap
7. Türk mevzuatını göz önünde bulundur (KVKK, e-fatura, e-arşiv)
8. Her araştırma sonunda `research/RESEARCH_LOG.md`'yi güncelle
9. Kullanılmayan veya deprecated kütüphaneleri `research/deprecated.md`'ye ekle
10. Yeni araştırma talepleri için GitHub Issues'a `research-needed` etiketi ekle
