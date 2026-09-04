# 🧪 TEST AGENT — Bakım Merkezi WebApp
## tests/AGENTS.md | Codex Test Specialist

---

## AGENT KİMLİĞİ

**Rol:** Test Agent  
**Sorumluluk:** Unit testler, integration testler, E2E testler, test coverage, CI pipeline  
**Çalışma Dizini:** `tests/`, `apps/*/src/**/*.test.ts`, `apps/*/src/**/*.spec.ts`  
**Test Çerçevesi:** Vitest (unit/integration) + Playwright (E2E)

---

## TEST STRATEJİSİ

### Test Piramidi
```
                    ┌─────────────────┐
                    │   E2E Tests     │  %10 — Kritik user journey'leri
                    │   (Playwright)  │
                ┌───┴─────────────────┴───┐
                │  Integration Tests      │  %30 — API endpoint testleri
                │  (Vitest + Supertest)   │
            ┌───┴─────────────────────────┴───┐
            │        Unit Tests               │  %60 — Servis ve utility fonk.
            │        (Vitest)                 │
            └─────────────────────────────────┘
```

### Coverage Hedefleri
```
Genel minimum: %80
Kritik modüller (auth, invoice, appointment): %95
UI bileşenleri: %70
Utility fonksiyonları: %90
```

---

## TEST DOSYA YAPISI

```
tests/
├── e2e/                              ← Playwright E2E testleri
│   ├── fixtures/
│   │   ├── auth.fixture.ts           ← Auth durumları
│   │   └── data.fixture.ts           ← Test verisi
│   ├── pages/                        ← Page Object Model
│   │   ├── LoginPage.ts
│   │   ├── CustomerPage.ts
│   │   ├── AppointmentPage.ts
│   │   └── InvoicePage.ts
│   ├── specs/
│   │   ├── auth.spec.ts              ← Giriş/çıkış akışları
│   │   ├── customer-crud.spec.ts     ← Müşteri yönetimi
│   │   ├── appointment-booking.spec.ts
│   │   ├── service-workflow.spec.ts  ← Servis akışı
│   │   ├── invoice-generation.spec.ts
│   │   └── inventory-management.spec.ts
│   └── playwright.config.ts

├── integration/                      ← API integration testleri
│   ├── setup/
│   │   ├── database.ts               ← Test DB hazırlama
│   │   ├── server.ts                 ← Test server başlatma
│   │   └── seed.ts                  ← Test verisi
│   ├── auth/
│   │   ├── login.test.ts
│   │   ├── refresh-token.test.ts
│   │   └── permission.test.ts
│   ├── customers/
│   │   ├── create.test.ts
│   │   ├── update.test.ts
│   │   └── delete.test.ts
│   ├── appointments/
│   │   ├── create.test.ts
│   │   ├── conflict-detection.test.ts
│   │   └── status-change.test.ts
│   ├── invoices/
│   │   ├── create.test.ts
│   │   ├── calculations.test.ts
│   │   └── payment.test.ts
│   └── inventory/
│       ├── stock-management.test.ts
│       └── low-stock-alerts.test.ts

apps/
├── api/src/
│   ├── services/
│   │   ├── customer.service.test.ts
│   │   ├── appointment.service.test.ts
│   │   ├── invoice.service.test.ts
│   │   └── inventory.service.test.ts
│   ├── utils/
│   │   └── validators.test.ts
│   └── middleware/
│       └── auth.middleware.test.ts
└── web/src/
    ├── components/
    │   ├── CustomerCard.test.tsx
    │   ├── AppointmentCalendar.test.tsx
    │   └── InvoiceForm.test.tsx
    └── lib/
        └── locale.test.ts
```

---

## UNIT TEST ÖRNEKLERI

### Servis Testi
```typescript
// apps/api/src/services/appointment.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppointmentService } from './appointment.service';
import { prismaMock } from '../../tests/mocks/prisma.mock';
import { createAppointmentFixture, createVehicleFixture } from '../../tests/fixtures';

describe('AppointmentService', () => {
  let service: AppointmentService;

  beforeEach(() => {
    service = new AppointmentService(prismaMock, redisMock);
    vi.clearAllMocks();
  });

  describe('checkConflict', () => {
    it('aynı teknisyen için çakışan randevuyu tespit etmeli', async () => {
      // Arrange
      const technicianId = 'tech-uuid-1';
      const existingAppointment = createAppointmentFixture({
        technicianId,
        scheduledAt: new Date('2025-01-15T10:00:00'),
        estimatedDuration: 120, // 2 saat
      });

      prismaMock.appointment.findMany.mockResolvedValue([existingAppointment]);

      // Act
      const conflict = await service.checkConflict({
        technicianId,
        scheduledAt: new Date('2025-01-15T11:00:00'), // Çakışıyor
        estimatedDuration: 60,
      });

      // Assert
      expect(conflict).not.toBeNull();
      expect(conflict?.id).toBe(existingAppointment.id);
    });

    it('farklı zaman diliminde çakışma olmamalı', async () => {
      prismaMock.appointment.findMany.mockResolvedValue([]);

      const conflict = await service.checkConflict({
        technicianId: 'tech-1',
        scheduledAt: new Date('2025-01-15T14:00:00'),
        estimatedDuration: 60,
      });

      expect(conflict).toBeNull();
    });

    it('iptal edilmiş randevuyu çakışma olarak saymamalı', async () => {
      const cancelledAppointment = createAppointmentFixture({
        status: 'cancelled',
      });
      prismaMock.appointment.findMany.mockResolvedValue([]);

      const conflict = await service.checkConflict({
        technicianId: 'tech-1',
        scheduledAt: new Date('2025-01-15T10:00:00'),
        estimatedDuration: 60,
      });

      expect(conflict).toBeNull();
    });
  });

  describe('create', () => {
    it('geçerli verilerle randevu oluşturmalı', async () => {
      const dto = {
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        serviceTypes: ['oil_change', 'brake_check'],
        scheduledAt: new Date('2025-01-15T10:00:00'),
        estimatedDuration: 90,
      };

      prismaMock.appointment.findMany.mockResolvedValue([]); // Çakışma yok
      prismaMock.appointment.create.mockResolvedValue(
        createAppointmentFixture({ ...dto, status: 'pending' })
      );

      const result = await service.create(dto, 'receptionist-user-id');

      expect(result.status).toBe('pending');
      expect(prismaMock.appointment.create).toHaveBeenCalledOnce();
    });

    it('çakışma varsa AppointmentConflictError fırlatmalı', async () => {
      prismaMock.appointment.findMany.mockResolvedValue([
        createAppointmentFixture({ technicianId: 'tech-1' }),
      ]);

      await expect(
        service.create(
          { technicianId: 'tech-1', scheduledAt: new Date(), estimatedDuration: 60 },
          'user-1'
        )
      ).rejects.toThrowError('APPOINTMENT_CONFLICT');
    });
  });
});
```

### Fatura Hesaplama Testi
```typescript
// apps/api/src/services/invoice.service.test.ts
describe('InvoiceService - Hesaplamalar', () => {
  describe('calculateTotal', () => {
    const testCases = [
      {
        name: 'KDV %18 ile basit hesaplama',
        items: [
          { quantity: 2, unitPrice: 100, discount: 0 }, // 200 TL
          { quantity: 1, unitPrice: 50, discount: 0 },  // 50 TL
        ],
        taxRate: 18,
        expected: { subtotal: 250, taxAmount: 45, total: 295 },
      },
      {
        name: '%10 indirim uygulanmış hesaplama',
        items: [{ quantity: 1, unitPrice: 1000, discount: 10 }],
        taxRate: 20,
        expected: { subtotal: 900, taxAmount: 180, total: 1080 },
      },
      {
        name: 'Sıfır KDV (ihracat faturası)',
        items: [{ quantity: 5, unitPrice: 200, discount: 0 }],
        taxRate: 0,
        expected: { subtotal: 1000, taxAmount: 0, total: 1000 },
      },
    ];

    it.each(testCases)('$name', ({ items, taxRate, expected }) => {
      const result = invoiceService.calculateTotal(items, taxRate);
      
      expect(result.subtotal).toBeCloseTo(expected.subtotal, 2);
      expect(result.taxAmount).toBeCloseTo(expected.taxAmount, 2);
      expect(result.total).toBeCloseTo(expected.total, 2);
    });
  });
});
```

---

## INTEGRATION TEST KURULUMU

```typescript
// tests/integration/setup/server.ts
import express from 'express';
import { app } from '../../../apps/api/src/app';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

// Test veritabanı — her test suite için temiz slate
const testPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env.TEST_DATABASE_URL },
  },
});

export function createTestServer() {
  return request(app);
}

export async function setupTestDB() {
  // Transaction içinde test verisi oluştur
  await testPrisma.$transaction(async (tx) => {
    await tx.user.create({ data: testUsers.admin });
    await tx.customer.createMany({ data: testCustomers });
    await tx.vehicle.createMany({ data: testVehicles });
  });
}

export async function cleanupTestDB() {
  // Tabloları sırayla temizle (foreign key sırasına dikkat)
  const tables = [
    'audit_logs', 'invoice_items', 'invoices',
    'part_usages', 'service_records', 'appointments',
    'vehicles', 'customers', 'users',
  ];
  
  for (const table of tables) {
    await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}
```

### API Integration Test
```typescript
// tests/integration/appointments/create.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestServer, setupTestDB, cleanupTestDB } from '../setup/server';
import { loginAsRole } from '../helpers/auth';

describe('POST /api/v1/appointments', () => {
  const server = createTestServer();
  let adminToken: string;
  let receptionistToken: string;

  beforeAll(async () => {
    await setupTestDB();
    adminToken = await loginAsRole(server, 'admin');
    receptionistToken = await loginAsRole(server, 'receptionist');
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  it('receptionist yeni randevu oluşturabilmeli', async () => {
    const response = await server
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        customerId: testCustomers[0].id,
        vehicleId: testVehicles[0].id,
        serviceTypes: ['oil_change'],
        scheduledAt: '2025-02-15T10:00:00Z',
        estimatedDuration: 60,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('pending');
    expect(response.body.data.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
  });

  it('teknisyen randevu oluşturamamalı', async () => {
    const techToken = await loginAsRole(server, 'technician');
    
    const response = await server
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ customerId: 'x', vehicleId: 'y', scheduledAt: new Date() });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('çakışan randevu oluşturulamamalı', async () => {
    // İlk randevuyu oluştur
    await createTestAppointment(server, adminToken, {
      technicianId: testTechnicians[0].id,
      scheduledAt: '2025-02-15T10:00:00Z',
      estimatedDuration: 120,
    });

    // Çakışan randevu denemesi
    const response = await server
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        technicianId: testTechnicians[0].id,
        scheduledAt: '2025-02-15T11:00:00Z', // Çakışıyor
        estimatedDuration: 60,
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('APPOINTMENT_CONFLICT');
  });

  it('geçersiz plaka formatı reddedilmeli', async () => {
    const response = await server
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plate: 'INVALID_PLATE', customerId: testCustomers[0].id });

    expect(response.status).toBe(422);
    expect(response.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'plate' })
    );
  });
});
```

---

## E2E TEST (PLAYWRIGHT)

### Page Object Model
```typescript
// tests/e2e/pages/AppointmentPage.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class AppointmentPage {
  readonly page: Page;
  readonly newAppointmentButton: Locator;
  readonly customerSearch: Locator;
  readonly vehicleSelect: Locator;
  readonly dateTimePicker: Locator;
  readonly serviceTypeCheckboxes: Locator;
  readonly submitButton: Locator;
  readonly conflictWarning: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newAppointmentButton = page.getByRole('button', { name: 'Yeni Randevu' });
    this.customerSearch = page.getByPlaceholder('Müşteri ara...');
    this.vehicleSelect = page.getByRole('combobox', { name: 'Araç seçin' });
    this.dateTimePicker = page.getByLabel('Tarih ve Saat');
    this.serviceTypeCheckboxes = page.getByRole('checkbox', { name: /Servis/ });
    this.submitButton = page.getByRole('button', { name: 'Randevu Oluştur' });
    this.conflictWarning = page.getByRole('alert', { name: /çakışma/ });
    this.successToast = page.getByText('başarıyla oluşturuldu');
  }

  async goto() {
    await this.page.goto('/appointments');
  }

  async createAppointment(data: AppointmentFormData) {
    await this.newAppointmentButton.click();
    
    // Müşteri seç
    await this.customerSearch.fill(data.customerName);
    await this.page.getByRole('option', { name: data.customerName }).click();
    
    // Araç seç
    await this.vehicleSelect.selectOption(data.vehiclePlate);
    
    // Tarih ve saat
    await this.dateTimePicker.fill(data.scheduledAt);
    
    // Servis tipleri
    for (const service of data.serviceTypes) {
      await this.page.getByLabel(service).check();
    }
    
    await this.submitButton.click();
  }

  async expectSuccess() {
    await expect(this.successToast).toBeVisible({ timeout: 5000 });
  }

  async expectConflictWarning() {
    await expect(this.conflictWarning).toBeVisible();
  }
}
```

### E2E Spec Dosyası
```typescript
// tests/e2e/specs/appointment-booking.spec.ts
import { test, expect } from '@playwright/test';
import { AppointmentPage } from '../pages/AppointmentPage';
import { loginAs } from '../fixtures/auth.fixture';

test.describe('Randevu Oluşturma Akışı', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'receptionist');
  });

  test('başarılı randevu oluşturma', async ({ page }) => {
    const appointmentPage = new AppointmentPage(page);
    await appointmentPage.goto();

    await appointmentPage.createAppointment({
      customerName: 'Ahmet Yılmaz',
      vehiclePlate: '34 ABC 1234',
      serviceTypes: ['Yağ Değişimi', 'Fren Kontrolü'],
      scheduledAt: '2025-02-15T10:00',
    });

    await appointmentPage.expectSuccess();

    // Takvimde görünüyor mu kontrol et
    await page.goto('/appointments');
    await expect(page.getByText('Ahmet Yılmaz')).toBeVisible();
  });

  test('çakışma uyarısı gösterilmeli', async ({ page }) => {
    // Bu fixture çakışan bir randevu içeriyor
    const appointmentPage = new AppointmentPage(page);
    await appointmentPage.createAppointment(conflictingAppointmentData);
    await appointmentPage.expectConflictWarning();
  });

  test('yetkisiz kullanıcı randevu oluşturamamalı', async ({ page }) => {
    await loginAs(page, 'technician');
    await page.goto('/appointments/new');
    
    await expect(page.getByText('Bu sayfaya erişim yetkiniz yok')).toBeVisible();
  });
});

test.describe('Servis İş Akışı', () => {
  test('araç teslim → servis başlat → tamamla → fatura', async ({ page }) => {
    await loginAs(page, 'technician');

    // 1. Randevuyu başlat
    await page.goto('/appointments');
    await page.getByTestId('appointment-34ABC1234').getByRole('button', { name: 'Servisi Başlat' }).click();
    await expect(page.getByText('Servis devam ediyor')).toBeVisible();

    // 2. Notlar ekle
    await page.getByLabel('Servis Notları').fill('Motor yağı değiştirildi, frenler kontrol edildi');

    // 3. Parça ekle
    await page.getByRole('button', { name: 'Parça Ekle' }).click();
    await page.getByPlaceholder('Parça ara...').fill('Motor Yağı');
    await page.getByRole('option', { name: 'Motor Yağı 5W-40' }).click();

    // 4. Servisi tamamla
    await page.getByRole('button', { name: 'Servisi Tamamla' }).click();
    await expect(page.getByText('Servis tamamlandı')).toBeVisible();

    // 5. Fatura oluştur (manager olarak giriş yap)
    await loginAs(page, 'manager');
    await page.goto('/invoices/new');
    // ...fatura akışı
  });
});
```

---

## PLAYWRIGHT KONFIGÜRASYONU

```typescript
// tests/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: [
    ['html', { outputFolder: '../../reports/playwright' }],
    ['junit', { outputFile: '../../reports/playwright/junit.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'pnpm --filter api dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

---

## VİTEST KONFIGÜRASYONU

```typescript
// vitest.config.ts (workspace root)
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './reports/coverage',
      
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Kritik modüller için daha yüksek eşik
        'apps/api/src/services/auth.service.ts': {
          branches: 95,
          functions: 95,
        },
        'apps/api/src/services/invoice.service.ts': {
          branches: 95,
          functions: 95,
        },
      },
      
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.ts',
        '**/types/**',
        '**/migrations/**',
        'tests/**',
      ],
    },
    
    pool: 'threads',
    poolOptions: {
      threads: { singleThread: true }, // Integration testler için
    },
  },
});
```

---

## TEST VERİSİ (FİXTURES)

```typescript
// tests/fixtures/index.ts

export function createCustomerFixture(overrides?: Partial<Customer>): Customer {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    phone: `0555${faker.string.numeric(7)}`,
    loyaltyPoints: faker.number.int({ min: 0, max: 1000 }),
    preferredContact: 'phone',
    vehicles: [],
    appointments: [],
    invoices: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createVehicleFixture(overrides?: Partial<Vehicle>): Vehicle {
  const brand = faker.helpers.arrayElement(['Toyota', 'Ford', 'Volkswagen', 'BMW', 'Mercedes']);
  return {
    id: faker.string.uuid(),
    customerId: faker.string.uuid(),
    plate: `${faker.number.int({ min: 1, max: 81 })} ${faker.string.alpha({ length: 3, casing: 'upper' })} ${faker.string.numeric(4)}`,
    brand,
    model: faker.helpers.arrayElement(['Corolla', 'Focus', 'Golf', '3 Serisi', 'C Serisi']),
    year: faker.number.int({ min: 2000, max: 2024 }),
    color: faker.color.human(),
    vin: faker.string.alphanumeric(17).toUpperCase(),
    engineType: faker.helpers.arrayElement(['gasoline', 'diesel', 'hybrid']),
    mileage: faker.number.int({ min: 0, max: 300000 }),
    serviceHistory: [],
    documents: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createAppointmentFixture(overrides?: Partial<Appointment>): Appointment {
  return {
    id: faker.string.uuid(),
    customerId: faker.string.uuid(),
    vehicleId: faker.string.uuid(),
    serviceTypes: ['oil_change'],
    scheduledAt: faker.date.future(),
    estimatedDuration: faker.helpers.arrayElement([30, 60, 90, 120, 180]),
    status: 'pending',
    priority: 'normal',
    estimatedCost: faker.number.float({ min: 100, max: 5000, fractionDigits: 2 }),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

---

## CI/CD TEST PIPELINE

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: bakim_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter api db:migrate:test
      - run: pnpm test:unit
      - run: pnpm test:integration
      
      - name: Coverage Raporu
        uses: codecov/codecov-action@v4
        with:
          files: reports/coverage/lcov.info
          fail_ci_if_error: true
          minimum_coverage: 80

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: unit-tests

    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright install --with-deps chromium
      - run: pnpm test:e2e --project=chromium
      
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: reports/playwright/
          retention-days: 7
```

---

## TEST KOMUTU REFERANSI

```bash
# Tüm testleri çalıştır
pnpm test

# Sadece unit testler
pnpm test:unit

# Sadece integration testler
pnpm test:integration

# E2E testler (önce dev server başlat)
pnpm test:e2e

# İzleme modunda (geliştirme sırasında)
pnpm test:watch

# Coverage raporu
pnpm test:coverage

# Belirli bir test dosyası
pnpm vitest run apps/api/src/services/appointment.service.test.ts

# Test pattern ile
pnpm vitest run --grep "çakışma"

# Playwright UI modu (görsel debug)
pnpm playwright test --ui

# Playwright belirli spec
pnpm playwright test tests/e2e/specs/appointment-booking.spec.ts
```

---

## CODEX NOTLARI

Bu agent çalışırken:

1. **Her yeni feature için önce test yaz** (TDD tercih edilir)
2. Test isimleri Türkçe yazılabilir — okunabilirlik önemli
3. `faker` ile test verisi oluştur, hard-coded değerler kullanma
4. Flaky testleri hemen düzelt — `test.retry()` geçici çözümdür
5. Coverage %80 altına düşerse **build'i blokla**
6. Her PR'da en az 1 yeni test zorunlu
7. Snapshot testlerini minimal kullan (kırılgan olabilir)
8. Test DB'si gerçek DB'den ayrı olmalı (TEST_DATABASE_URL)
9. E2E testler yavaş — sadece kritik user journey'leri kapsasın
10. Mock'ları aşırı kullanma — integration testlerde gerçek DB kullan
