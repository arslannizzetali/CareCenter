# 🖥️ WEB AGENT — Hasta Bakım Merkezi
## apps/web/AGENTS.md | Codex Next.js Frontend Specialist

---

## AGENT KİMLİĞİ

**Rol:** Web Agent
**Sorumluluk:** Next.js 14 App Router, sayfalar, API entegrasyonu, state yönetimi
**Çalışma Dizini:** `apps/web/`

---

## TASARIM DİLİ

Beyaz arkaplan (#FFFFFF) üzerine profesyonel, temiz, güven verici arayüz.
Hasta bakım merkezine yakışan — sade, net, ciddi ama sıcak.

```
Renkler:
  Primary:     #1E40AF  (koyu mavi — güven)
  Background:  #FFFFFF  (beyaz)
  Surface:     #F8FAFC  (kart arkaplanı)
  Border:      #E2E8F0
  Text:        #0F172A
  Text Muted:  #64748B
  Success:     #16A34A
  Warning:     #D97706
  Danger:      #DC2626

Evrak Öncelikleri:
  RED:    bg-red-50    border-red-300    text-red-800    — kritik
  YELLOW: bg-yellow-50 border-yellow-300 text-yellow-800 — yarı önemli
  GREEN:  bg-green-50  border-green-300  text-green-800  — standart

Hasta Durumu:
  ACTIVE:       bg-green-100  text-green-800
  DISCHARGED:   bg-gray-100   text-gray-800
  TRANSFERRED:  bg-blue-100   text-blue-800

Hasta Ruh Hali:
  GOOD:     bg-green-100  text-green-800  ● İyi
  MODERATE: bg-yellow-100 text-yellow-800 ● Orta
  BAD:      bg-red-100    text-red-800    ● Kötü

Güncelleme Türü İkonları:
  MEDICATION:    💊 (ilaç verildi)
  CARE:          🤲 (bakım yapıldı)
  OBSERVATION:   👁️  (gözlem)
  STATUS_CHANGE: 🔄 (durum değişti)
  VITAL_SIGNS:   📊 (vital bulgular)
  INCIDENT:      ⚠️  (olay/kaza)

Font: Inter (Google Fonts)
```

---

## SAYFA YAPISI

```
/login                         ← Giriş sayfası
/(dashboard)/
  /dashboard                   ← Ana sayfa
  /patients                    ← Hasta listesi + arama
  /patients/new                ← Yeni hasta
  /patients/[id]               ← Hasta detayı
  /patients/[id]/update        ← Yeni güncelleme gir
  /patients/[id]/documents     ← Evrak yönetimi
  /admin/
    /users                     ← Çalışan listesi (sadece admin)
    /users/new                 ← Yeni çalışan (sadece admin)
    /patients                  ← Admin hasta paneli + filtreler (sadece admin)
    /recent-updates            ← Son güncellemeler (sadece admin)
    /audit-logs                ← Aktivite kayıtları (sadece admin)
    /settings                  ← Silme politikaları (sadece admin)
```

---

## KRİTİK SAYFALAR — DETAYLI TANIMLAR

### 1. GİRİŞ SAYFASI (/login)
```
- Ortada beyaz kart (shadow-md, rounded-xl)
- Üstte logo alanı + "BakımEvi" yazısı
- E-posta input
- Şifre input + göster/gizle butonu
- "Giriş Yap" butonu (primary renk, full width)
- Hata durumları:
  - Şifre yanlış: "E-posta veya şifre hatalı"
  - Hesap kilitli: "Çok fazla başarısız deneme. X dakika sonra tekrar deneyin."
  - Hesap pasif: "Hesabınız devre dışı. Yöneticinizle iletişime geçin."
```

### 2. DASHBOARD (/dashboard)

**Admin dashboard:**
```
Üst satır — 4 istatistik kartı:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Aktif Hasta  │ │ Toplam Evrak │ │ Bugün Güncell│ │ Aktif Çalışan│
│     42       │ │     318      │ │     17       │ │      8       │
│ ↑ 3 bu hafta │ │🔴12 🟡98 🟢208│ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

Alt bölüm — 2 kolon:
Sol: Son Güncellemeler (son 10 hasta güncellemesi, tüm çalışanlar)
Sağ: Acil Güncellemeler (isUrgent=true olanlar, kırmızı vurgulu)
```

**Çalışan dashboard:**
```
Üst satır — 2 istatistik kartı:
┌──────────────────────┐  ┌──────────────────────┐
│ Bugün Güncellediğim  │  │ Bu Hafta Yüklediğim  │
│       5 hasta        │  │      8 evrak         │
└──────────────────────┘  └──────────────────────┘

Alt: Kendi son güncellemelerim (son 5)
```

### 3. HASTA LİSTESİ (/patients)
```
Üstte arama kutusu (büyük, belirgin):
  placeholder: "Hasta adı, soyad veya oda numarası ile ara..."
  300ms debounce

Filtreler (inline, küçük butonlar):
  Durum: [Tümü] [Aktif] [Taburcu] [Transfer]
  Tür:   [Tümü] [Yaşlı] [Engelli] [Her İkisi]

Kart listesi (her hasta için):
┌──────────────────────────────────────────────────┐
│ 👤 Ahmet Yılmaz          Oda: 12A    🟢 Aktif   │
│    72 yaş | Yaşlı        Son güncelleme: 2s önce │
│    🔴 3 evrak  🟡 5 evrak  🟢 12 evrak            │
│                                    [Detay →]     │
└──────────────────────────────────────────────────┘
```

### 4. HASTA DETAY SAYFASI (/patients/[id]) — EN ÖNEMLİ SAYFA
```
Üst alan — hasta bilgileri kartı:
┌─────────────────────────────────────────────────────────┐
│ 👤 Ahmet Yılmaz                          🟢 AKTİF      │
│ 72 yaş  |  Erkek  |  Oda: 12A  |  Yaşlı bakım          │
│ Giriş: 15 Ocak 2024  |  Bakım: 347 gün                 │
│                                                         │
│ ⚠️ Alerjiler: Penisilin, Aspirin                        │
│ 💊 Süregelen ilaçlar: Metformin 500mg, Lisinopril 10mg  │
│ 🚶 Hareketlilik: Yardımlı                               │
│                                                         │
│ Acil İletişim: Fatma Yılmaz (kızı) — 0532 xxx xx xx    │
└─────────────────────────────────────────────────────────┘

Sekmeler:
[📋 Güncellemeler] [📎 Evraklar] [ℹ️ Bilgiler]

─── GÜNCELLEMELER SEKMESİ ───────────────────────────────

[+ Yeni Güncelleme Ekle] butonu (sağ üst, primary)

Güncelleme kartı (timeline görünümü, yeniden eskiye):
┌──────────────────────────────────────────────────────┐
│ 💊 İlaç Verildi              Mehmet Demir — 14:30    │
│ ─────────────────────────────────────────────────    │
│ Metformin 500mg oral verildi. Hasta ilacını          │
│ sorunsuz aldı.                                       │
│                                                      │
│ Verilen İlaçlar:                                     │
│   • Metformin 500mg — oral — 14:30                   │
│                                                      │
│ Vital Bulgular:                                      │
│   Tansiyon: 130/85  |  Nabız: 78  |  Ateş: 36.8°C  │
│                                                      │
│ Ruh Hali: ● İyi                                      │
└──────────────────────────────────────────────────────┘

⚠️ ACİL güncelleme ise kart kırmızı kenarlıklı + ACİL badge

─── EVRAKLAR SEKMESİ ────────────────────────────────────

[+ Evrak Yükle] butonu (sağ üst)

🔴 KRİTİK EVRAKLAR (3 adet)
   [ℹ️ Bu evraklar hiçbir zaman silinemez]
   ┌─────────────────────────────────────────────────┐
   │ 📄 hasta_dosyasi.pdf      Ahmet Yılmaz         │
   │    2.3 MB | 12 Ocak 2025 14:30                 │
   │    [İndir]  [Öncelik Değiştir*]               │
   └─────────────────────────────────────────────────┘

🟡 YARI ÖNEMLİ EVRAKLAR (5 adet)
   ┌─────────────────────────────────────────────────┐
   │ 📄 sigorta_poliçe.pdf     Mehmet Demir         │
   │    1.1 MB | 10 Ocak 2025 09:15                 │
   │    [İndir]  [Öncelik Değiştir*]  [Sil*]       │
   └─────────────────────────────────────────────────┘

🟢 STANDART EVRAKLAR (12 adet)
   ...

* sadece admin görür

### 5. YENİ GÜNCELLEME GİR (/patients/[id]/update)
```
Form alanları:
1. Güncelleme Türü (büyük ikonlu kart seçimi):
   [💊 İlaç Verildi] [🤲 Bakım Yapıldı] [👁️ Gözlem]
   [🔄 Durum Değişti] [📊 Vital Bulgular] [⚠️ Olay]

2. Açıklama (textarea, zorunlu)

3. Türe göre dinamik alanlar:
   MEDICATION seçiliyse:
     + Ekle butonu ile ilaç girişi:
     [İlaç Adı] [Doz] [Yol: oral/IV/...] [Verilme Saati]

   VITAL_SIGNS veya MEDICATION seçiliyse:
     Vital Bulgular (hepsi opsiyonel):
     [Tansiyon] [Nabız] [Ateş] [SpO2] [Kilo] [Kan Şekeri]

   CARE seçiliyse:
     Yapılan Bakım (çoklu seçim checkbox):
     ☐ Banyo yardımı  ☐ Beslenme yardımı  ☐ Fizik tedavi
     ☐ Yara bakımı    ☐ Psikolojik destek  ☐ Egzersiz
     ☐ İlaç hatırlatma ☐ Kıyafet değişimi

4. Hasta Ruh Hali (3 büyük buton):
   [🟢 İyi] [🟡 Orta] [🔴 Kötü]

5. Sonraki Adım (textarea, opsiyonel)

6. ⚠️ ACİL Durum toggle (kırmızı, belirgin)
   "Bu güncelleme acil durum bildirimi"

7. [Kaydet] butonu
```

### 6. ADMİN — SON GÜNCELLEMELER (/admin/recent-updates)
```
Filtreler:
  [Çalışan seç ▼] [Tür seç ▼] [Tarih aralığı] [Sadece Aciller ☐]

Tablo:
Tarih/Saat | Çalışan | Hasta | Oda | Tür | Özet | Acil?
──────────────────────────────────────────────────────────
14:30 bugün  Mehmet D.  Ahmet Y.  12A  💊 İlaç  Metformin...  —
13:15 bugün  Ayşe K.    Fatma S.  7B   🤲 Bakım  Banyo yardımı  ⚠️ ACİL
...

Satıra tıklayınca modal'da tam detay açılır.
Sayfalama: 25 kayıt/sayfa
```

### 7. ADMİN — HASTALAR PANELİ (/admin/patients)
```
Arama + Filtreler (genişletilmiş):
  Metin arama: [Ad, soyad, oda no...]
  Durum: [Tümü ▼]
  Bakım türü: [Tümü ▼]
  Hareketlilik: [Tümü ▼]
  Giriş tarihi: [Başlangıç] → [Bitiş]

Sonuçlar tablo görünümünde:
Ad Soyad | Yaş | Oda | Tür | Durum | Son Güncelleme | Evrak | İşlem
──────────────────────────────────────────────────────────────────
Ahmet Y.  72    12A   Yaşlı  🟢 Aktif   14:30 bugün    🔴1🟡5🟢12  [Görüntüle]
Fatma S.  65    7B    Her iki 🟢 Aktif   13:15 bugün    🔴0🟡2🟢8   [Görüntüle]

Export: [CSV İndir] butonu (sadece admin)
```

### 8. ADMİN — AYARLAR (/admin/settings)
```
Evrak Silme Politikaları:

🟡 Sarı Evraklar
  Otomatik silme: [AÇIK ●────] / [KAPALI]
  Yüklendikten kaç gün sonra: [90] gün
  (0 = otomatik silme kapalı)

🟢 Yeşil Evraklar
  Otomatik silme: [AÇIK ●────]
  Yüklendikten kaç gün sonra: [30] gün

[Kaydet] butonu

Son güncelleme: 15 Ocak 2025, Yönetici Admin tarafından
```

---

## API CLIENT KATMANI

```typescript
// apps/web/src/lib/api/patient-update.api.ts
export const patientUpdateApi = {
  create: (patientId: string, dto: CreatePatientUpdateDto) =>
    api.post<PatientUpdate>(`/patients/${patientId}/updates`, dto),

  listForPatient: (patientId: string, params?: PatientUpdateQuery) =>
    api.get<PaginatedResponse<PatientUpdate>>(
      `/patients/${patientId}/updates${buildQuery(params)}`
    ),

  getRecent: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<PatientUpdate>>(
      `/patient-updates/recent${buildQuery(params)}`
    ),
};

// Query keys
export const queryKeys = {
  patients: {
    all: ['patients'] as const,
    list: (p: object) => ['patients', 'list', p] as const,
    detail: (id: string) => ['patients', id] as const,
  },
  patientUpdates: {
    forPatient: (patientId: string, p?: object) =>
      ['patient-updates', patientId, p] as const,
    recent: (p?: object) => ['patient-updates', 'recent', p] as const,
  },
  documents: {
    forPatient: (patientId: string) => ['documents', patientId] as const,
  },
  admin: {
    stats: ['admin', 'stats'] as const,
    auditLogs: (p: object) => ['admin', 'audit-logs', p] as const,
  },
} as const;
```

---

## ZUSTAND STORE

```typescript
// auth.store.ts
interface AuthState {
  user: { id: string; firstName: string; lastName: string; role: 'ADMIN' | 'EMPLOYEE' } | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}
```

---

## NEXT.JS KURALLARI

```
Server Component (default):
  - page.tsx dosyaları
  - İlk yükleme verisi fetch eden bileşenler

Client Component ('use client'):
  - Form bileşenleri
  - useState/useEffect kullananlar
  - TanStack Query hook'ları

Her sayfa için loading.tsx zorunlu.
Route koruma layout seviyesinde yapılır.
Admin sayfaları /admin/ altında, layout'ta role kontrolü.
```

---

## PERFORMANS

```typescript
// Ağır bileşenler lazy load
const PatientUpdateForm = dynamic(() => import('./PatientUpdateForm'), {
  loading: () => <Skeleton className="h-96" />,
  ssr: false,
});

// Arama debounce (300ms)
const debouncedSearch = useDebounce(search, 300);

// Güncelleme listesi — sonsuz scroll
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: queryKeys.patientUpdates.forPatient(patientId),
  queryFn: ({ pageParam = 1 }) =>
    patientUpdateApi.listForPatient(patientId, { page: pageParam }),
  getNextPageParam: (last) => last.pagination.hasNext ? last.pagination.page + 1 : undefined,
});
```

---

## CODEX NOTLARI

1. Hasta detay sayfası çekirdek — en çok dikkat bu sayfaya
2. Güncelleme formu dinamik — seçilen türe göre farklı alanlar çıkar
3. Acil güncelleme her yerden görünür olmalı (kırmızı badge, liste önde)
4. Admin ve çalışan aynı sayfaları görür ama farklı butonlarla (can() hook ile kontrol)
5. Skeleton loader her async bileşen için zorunlu
6. Tarihler Türkçe format: "14 Ocak 2025, 14:30" veya "2 saat önce"
7. Mobile-first tasarım — tablet kullanımı düşünülerek
8. src/ui/AGENTS.md tasarım kurallarını da oku
