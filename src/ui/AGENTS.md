# 🎨 UI AGENT — Bakım Merkezi WebApp
## src/ui/AGENTS.md | Codex Frontend Specialist

---

## AGENT KİMLİĞİ

**Rol:** UI Agent  
**Sorumluluk:** Tüm frontend bileşenler, sayfalar, UX akışları, görsel tasarım  
**Çalışma Dizini:** `apps/web/`  
**Framework:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui

---

## TASARIM SİSTEMİ

### Renk Paleti
```css
/* apps/web/src/app/globals.css */
:root {
  /* Marka renkleri — Profesyonel, güven verici */
  --primary: 220 90% 56%;          /* #2563EB - Güçlü mavi */
  --primary-foreground: 0 0% 100%;
  
  --secondary: 215 25% 27%;        /* #2D3B55 - Koyu lacivert */
  --secondary-foreground: 0 0% 100%;

  --accent: 38 92% 50%;            /* #F59E0B - Uyarı sarısı */
  --accent-foreground: 0 0% 0%;
  
  --success: 142 71% 45%;          /* #22C55E - Başarı yeşili */
  --warning: 38 92% 50%;           /* #F59E0B - Uyarı */
  --danger: 0 84% 60%;             /* #EF4444 - Hata kırmızısı */
  --info: 199 89% 48%;             /* #0EA5E9 - Bilgi mavisi */

  /* Nötr renkler */
  --background: 0 0% 100%;
  --foreground: 222 84% 5%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;
  --card: 0 0% 100%;
  --card-foreground: 222 84% 5%;

  /* Status renkleri */
  --status-pending: 38 92% 50%;
  --status-confirmed: 199 89% 48%;
  --status-in-progress: 142 71% 45%;
  --status-completed: 215 25% 27%;
  --status-cancelled: 0 84% 60%;
  --status-urgent: 0 84% 60%;
}

.dark {
  --background: 222 84% 5%;
  --foreground: 210 40% 98%;
  --card: 222 47% 11%;
  --border: 217 33% 17%;
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
}
```

### Tipografi
```typescript
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
    },
  },
};
```

---

## SAYFA MİMARİSİ

### Route Yapısı (Next.js App Router)
```
apps/web/src/app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   ├── forgot-password/
│   │   └── page.tsx
│   └── layout.tsx
│
├── (dashboard)/
│   ├── layout.tsx              ← Sidebar + Header layout
│   ├── page.tsx                ← Dashboard ana sayfa
│   │
│   ├── customers/
│   │   ├── page.tsx            ← Müşteri listesi
│   │   ├── new/
│   │   │   └── page.tsx        ← Yeni müşteri
│   │   └── [id]/
│   │       ├── page.tsx        ← Müşteri detayı
│   │       ├── edit/
│   │       │   └── page.tsx
│   │       └── vehicles/
│   │           └── page.tsx
│   │
│   ├── vehicles/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── edit/page.tsx
│   │       └── service-history/page.tsx
│   │
│   ├── appointments/
│   │   ├── page.tsx            ← Randevu takvimi
│   │   ├── new/page.tsx
│   │   ├── list/page.tsx       ← Liste görünümü
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/page.tsx
│   │
│   ├── services/
│   │   ├── page.tsx            ← Aktif servisler
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── checklist/page.tsx
│   │   └── history/page.tsx
│   │
│   ├── inventory/
│   │   ├── page.tsx            ← Parça listesi
│   │   ├── new/page.tsx
│   │   ├── [id]/page.tsx
│   │   └── low-stock/page.tsx  ← Düşük stok alarmları
│   │
│   ├── invoices/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── pdf/route.ts    ← PDF indirme
│   │
│   ├── technicians/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   │
│   ├── reports/
│   │   ├── page.tsx
│   │   ├── revenue/page.tsx
│   │   ├── services/page.tsx
│   │   └── inventory/page.tsx
│   │
│   └── settings/
│       ├── page.tsx
│       ├── profile/page.tsx
│       ├── business/page.tsx
│       ├── users/page.tsx
│       └── notifications/page.tsx
│
└── api/                        ← Next.js API routes (BFF)
    └── v1/
        └── [...path]/route.ts  ← API proxy
```

---

## BİLEŞEN KATALOğU

### Layout Bileşenleri
```typescript
// apps/web/src/components/layout/

Sidebar/
  ├── Sidebar.tsx              ← Navigasyon menüsü
  ├── SidebarItem.tsx          ← Tek menü öğesi
  ├── SidebarSection.tsx       ← Menü grubu başlığı
  └── SidebarBadge.tsx         ← Bildirim sayacı

Header/
  ├── Header.tsx               ← Üst bar
  ├── UserMenu.tsx             ← Kullanıcı dropdown
  ├── NotificationBell.tsx     ← Bildirim zili
  └── SearchBar.tsx            ← Global arama

PageLayout/
  ├── PageHeader.tsx           ← Sayfa başlığı + breadcrumb + aksiyon butonları
  ├── PageContent.tsx          ← İçerik wrapper
  └── EmptyState.tsx           ← Veri yoksa gösterilecek
```

### Veri Görüntüleme Bileşenleri
```typescript
// apps/web/src/components/data/

DataTable/
  ├── DataTable.tsx            ← TanStack Table wrapper
  ├── DataTableHeader.tsx      ← Sıralama + başlık
  ├── DataTablePagination.tsx  ← Sayfalama
  ├── DataTableSearch.tsx      ← Tablo içi arama
  ├── DataTableFilter.tsx      ← Filtre paneli
  └── DataTableActions.tsx     ← Satır aksiyonları

Stats/
  ├── StatCard.tsx             ← Tek istatistik kartı
  ├── StatGrid.tsx             ← 4'lü stat grid
  └── StatChange.tsx           ← Değişim göstergesi (▲ %12)

Charts/
  ├── RevenueChart.tsx         ← Aylık gelir line chart
  ├── ServiceTypeChart.tsx     ← Servis dağılımı pie chart
  ├── TechnicianChart.tsx      ← Teknisyen performansı bar
  └── AppointmentHeatmap.tsx   ← Randevu yoğunluk haritası
```

### Form Bileşenleri
```typescript
// apps/web/src/components/forms/

CustomerForm/
  ├── CustomerForm.tsx
  ├── CustomerSearchCombobox.tsx   ← Müşteri arama + seçme
  └── CustomerQuickCreate.tsx      ← Modal'dan hızlı oluştur

VehicleForm/
  ├── VehicleForm.tsx
  ├── PlateInput.tsx               ← Türk plaka formatı (otomatik büyük harf)
  ├── VinInput.tsx                 ← VIN validator
  └── VehicleQuickCreate.tsx

AppointmentForm/
  ├── AppointmentForm.tsx
  ├── ServiceTypeSelector.tsx      ← Çoklu servis tipi seçimi
  ├── TechnicianSelector.tsx       ← Müsait teknisyen seçimi
  ├── DateTimePicker.tsx           ← Takvim + saat seçici (tr locale)
  └── ConflictWarning.tsx          ← Randevu çakışma uyarısı

InvoiceForm/
  ├── InvoiceForm.tsx
  ├── InvoiceLineItem.tsx          ← Fatura kalemi
  ├── TaxCalculator.tsx            ← KDV hesaplama
  └── PaymentMethodSelector.tsx
```

### Domain Bileşenleri
```typescript
// apps/web/src/components/domain/

Customer/
  ├── CustomerCard.tsx             ← Özet kart
  ├── CustomerBadge.tsx            ← Inline referans
  ├── CustomerHistory.tsx          ← Geçmiş timeline
  └── CustomerLoyaltyBadge.tsx     ← Sadakat puanı

Vehicle/
  ├── VehicleCard.tsx
  ├── VehiclePlate.tsx             ← Gerçekçi Türk plakası görünümü
  ├── VehicleStatusBadge.tsx
  └── VehicleTimeline.tsx          ← Servis geçmişi timeline

Appointment/
  ├── AppointmentCard.tsx
  ├── AppointmentStatusBadge.tsx
  ├── AppointmentCalendar.tsx      ← Aylık/haftalık takvim görünümü
  └── AppointmentTimeline.tsx      ← Gün görünümü

Service/
  ├── ServiceCard.tsx
  ├── ServiceStatusTracker.tsx     ← Adım adım durum takibi
  ├── ServiceChecklist.tsx         ← Yapılacaklar listesi
  └── TechnicianAssignment.tsx     ← Teknisyen atama UI

Inventory/
  ├── PartCard.tsx
  ├── StockLevelIndicator.tsx      ← Stok seviye çubuğu
  └── LowStockAlert.tsx           ← Kritik stok uyarısı
```

---

## DASHBOARD TASARIMI

```typescript
// apps/web/src/app/(dashboard)/page.tsx
// Dashboard ana sayfa layout'u

/*
┌─────────────────────────────────────────────────────────┐
│  Bugün, 14 Ocak 2025                    🔔 ⚙️ 👤        │
├──────┬──────────────────────────────────────────────────┤
│      │  Bugünkü Randevular    Aktif Servisler           │
│  S   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────┐  │
│  i   │  │ Randevu  │ │ Aktif    │ │ Bekleyen │ │Aylık│  │
│  d   │  │    8     │ │Servis  5 │ │ Parça  3 │ │Gelir│  │
│  e   │  │  ▲ %20   │ │          │ │          │ │ 45K │  │
│  b   │  └──────────┘ └──────────┘ └──────────┘ └────┘  │
│  a   │                                                   │
│  r   │  ┌──────────────────┐  ┌────────────────────┐    │
│      │  │  Aktif Servisler │  │   Bugünkü Takvim   │    │
│      │  │                  │  │                    │    │
│      │  │  🔧 34 ABC 1234  │  │  09:00 Yılmaz A.  │    │
│      │  │  ████░░░░ %60    │  │  10:30 Demir K.   │    │
│      │  │                  │  │  11:00 Kaya M.    │    │
│      │  │  🔧 06 XY 5678   │  │  13:00 Şahin B.   │    │
│      │  │  ██░░░░░░ %30    │  │  ...              │    │
│      │  └──────────────────┘  └────────────────────┘    │
│      │                                                   │
│      │  ┌────────────────────────────────────────────┐  │
│      │  │  Aylık Gelir Grafiği                       │  │
│      │  │  [Line Chart - Recharts]                   │  │
│      │  └────────────────────────────────────────────┘  │
└──────┴──────────────────────────────────────────────────┘
*/
```

---

## BİLEŞEN YAZIM KURALLARI

### Bileşen Şablonu
```typescript
// Tüm bileşenler bu yapıya uysun

'use client'; // Sadece client-side state/effect gerekiyorsa

import { type FC } from 'react';
import { cn } from '@/lib/utils';

interface CustomerCardProps {
  customer: Customer;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}

// Named export kullan (default export değil)
export const CustomerCard: FC<CustomerCardProps> = ({
  customer,
  isSelected = false,
  onSelect,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 transition-all',
        'hover:shadow-md hover:border-primary/20',
        isSelected && 'border-primary shadow-md ring-1 ring-primary',
        className
      )}
      onClick={() => onSelect?.(customer.id)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {/* İçerik */}
    </div>
  );
};
```

### Server vs Client Bileşenleri
```
Server Component (default, 'use client' yok):
  - Veri fetchleme yapan bileşenler
  - SEO gerektiren sayfalar
  - Statik içerik
  - Büyük listeler (streaming ile)

Client Component ('use client' zorunlu):
  - useState, useEffect kullananlar
  - Event handler içerenler
  - Browser API kullananlar
  - Real-time güncellemeleri alanlar
```

### Veri Fetching Kalıpları
```typescript
// ✅ Server Component — doğrudan fetch
// apps/web/src/app/(dashboard)/customers/page.tsx
async function CustomersPage() {
  const customers = await customerService.getAll(); // Doğrudan servis çağrısı
  
  return <CustomerList customers={customers} />;
}

// ✅ Client Component — TanStack Query
// apps/web/src/components/domain/AppointmentCalendar.tsx
'use client';
function AppointmentCalendar({ date }: { date: Date }) {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', format(date, 'yyyy-MM')],
    queryFn: () => appointmentApi.getByMonth(date),
    staleTime: 30_000, // 30 saniye
  });

  if (isLoading) return <CalendarSkeleton />;
  return <Calendar appointments={appointments} />;
}
```

---

## FORM YÖNETİMİ

```typescript
// Tüm formlar React Hook Form + Zod kullanır
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCustomerSchema } from '@bakim/validation';
import type { z } from 'zod';

type FormValues = z.infer<typeof CreateCustomerSchema>;

export function CustomerForm({ onSuccess }: { onSuccess: (id: string) => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(CreateCustomerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      preferredContact: 'phone',
    },
  });

  const { mutate: createCustomer, isPending } = useMutation({
    mutationFn: customerApi.create,
    onSuccess: (data) => {
      toast.success(`${data.firstName} ${data.lastName} başarıyla eklendi`);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess(data.id);
    },
    onError: (error) => {
      if (error.code === 'DUPLICATE_EMAIL') {
        form.setError('email', { message: 'Bu e-posta zaten kayıtlı' });
      } else {
        toast.error('Müşteri oluşturulurken hata oluştu');
      }
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createCustomer(data))}>
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ad</FormLabel>
              <FormControl>
                <Input placeholder="Ahmet" {...field} />
              </FormControl>
              <FormMessage /> {/* Zod hata mesajı */}
            </FormItem>
          )}
        />
        {/* Diğer alanlar... */}
        <Button type="submit" disabled={isPending}>
          {isPending ? <Spinner /> : 'Kaydet'}
        </Button>
      </form>
    </Form>
  );
}
```

---

## TÜRKÇE YERELLEŞTIRME

```typescript
// apps/web/src/lib/locale.ts
import { tr } from 'date-fns/locale';
import { format, formatDistanceToNow } from 'date-fns';

// Tarih formatlama
export const formatDate = (date: Date) =>
  format(date, 'dd MMMM yyyy', { locale: tr });

export const formatDateTime = (date: Date) =>
  format(date, 'dd MMM yyyy, HH:mm', { locale: tr });

export const formatRelative = (date: Date) =>
  formatDistanceToNow(date, { locale: tr, addSuffix: true });

// Para formatlama (Türk Lirası)
export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount);

// Plaka formatlama görünümü
export const formatPlate = (plate: string): string => {
  // "34ABC1234" → "34 ABC 1234"
  return plate.replace(/^(\d{2})([A-Z]+)(\d+)$/, '$1 $2 $3');
};
```

---

## ERİŞİLEBİLİRLİK (A11y)

```typescript
// Her bileşende WCAG 2.1 AA uyumu zorunludur

// ✅ Doğru — semantik HTML
<nav aria-label="Ana menü">
  <ul>
    <li><a href="/customers" aria-current={isActive ? 'page' : undefined}>Müşteriler</a></li>
  </ul>
</nav>

// ✅ Doğru — ARIA label'lar
<button aria-label="Müşteri Ahmet Yılmaz'ı düzenle">
  <EditIcon aria-hidden="true" />
</button>

// ✅ Doğru — Focus management (modal'lar için)
<Dialog onOpenAutoFocus={(e) => e.preventDefault()}>
  {/* İlk odaklanılabilir elemente focus ver */}
</Dialog>

// ✅ Doğru — Loading durumu bildirimi
<div role="status" aria-live="polite">
  {isLoading ? 'Yükleniyor...' : ''}
</div>

// Renk kontrast oranı minimum 4.5:1 (AA) olmalı
// Tüm interaktif elementler klavye ile erişilebilir olmalı
// Ekran okuyucu testleri: VoiceOver (macOS) + NVDA (Windows)
```

---

## RESPONSIVE TASARIM

```
Breakpoints:
  sm: 640px   → Tablet dikey
  md: 768px   → Tablet yatay
  lg: 1024px  → Laptop
  xl: 1280px  → Desktop
  2xl: 1536px → Geniş ekran

Sidebar davranışı:
  < lg  → Drawer (overlay olarak açılır)
  ≥ lg  → Sabit sidebar (sol kolonda)

DataTable davranışı:
  < md  → Kart görünümüne geç
  ≥ md  → Normal tablo

Takvim davranışı:
  < sm  → Günlük görünüm
  < lg  → Haftalık görünüm
  ≥ lg  → Aylık + günlük panel
```

---

## PERFORMANS KURALLARI

```typescript
// 1. Görüntüler için Next.js Image kullan
import Image from 'next/image';
<Image src={url} alt="..." width={400} height={300} loading="lazy" />

// 2. Büyük listeler için virtualization
import { useVirtualizer } from '@tanstack/react-virtual';

// 3. Ağır bileşenleri lazy load et
const InvoicePdfPreview = dynamic(() => import('./InvoicePdfPreview'), {
  loading: () => <Skeleton className="h-96" />,
  ssr: false,
});

// 4. Client-side navigation için prefetch
<Link href="/customers/123" prefetch>Müşteri Detayı</Link>

// 5. API çağrılarında debounce (arama kutuları)
const debouncedSearch = useDebouncedCallback(setSearch, 300);

// 6. Loading skeleton'ları component ile eşleştir
// Her page.tsx için loading.tsx oluştur
```

---

## TOAST BİLDİRİM STANDARTLARI

```typescript
import { toast } from 'sonner';

// ✅ Başarı
toast.success('Müşteri başarıyla oluşturuldu');

// ✅ Hata (teknik detay değil kullanıcı dostu mesaj)
toast.error('Kayıt sırasında hata oluştu. Lütfen tekrar deneyin.');

// ✅ Bilgi
toast.info('Randevu hatırlatması gönderildi');

// ✅ Undo desteği (silme işlemleri için)
toast.success('Müşteri silindi', {
  action: {
    label: 'Geri Al',
    onClick: () => restoreCustomer(id),
  },
  duration: 5000,
});

// ❌ Teknik hata mesajı gösterme
toast.error('ECONNREFUSED: Connection refused at 127.0.0.1:5432'); // YANLIŞ
```

---

## CODEX NOTLARI

Bu agent çalışırken:

1. Her bileşen için **Storybook** hikayesi ekle (components/stories/)
2. Mobil önce tasarla (mobile-first CSS)
3. Karanlık mod her bileşende test edilmeli
4. Form'larda **iyimser güncelleme** (optimistic update) uygula
5. Skeleton loader her veri bileşeni için zorunlu
6. Türkçe UI metni için `apps/web/src/lib/i18n/tr.ts` dosyasını kullan
7. Plaka, telefon, tarih gibi Türkiye'ye özgü formatları `locale.ts`'de merkezi tut
8. shadcn/ui bileşenlerini `components/ui/` altında özelleştir, kütüphane dosyalarını değiştirme
