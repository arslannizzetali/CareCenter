# 🏥 SYSTEM AGENT — Hasta Bakım Merkezi Yönetim Sistemi
## Root AGENTS.md | Codex Coordination Layer

---

## PROJE KİMLİĞİ

**Uygulama Adı:** BakımEvi — Engelli ve Yaşlı Bakım Merkezi Yönetim Sistemi
**Tür:** Şirket içi (intranet) — internete açık değil
**Kullanıcılar:** Admin (yönetici) + Çalışan (bakım personeli)
**Mimari:** Monorepo (Next.js 14 App Router + Node.js/Express API + PostgreSQL)
**Dil:** TypeScript strict mode (zorunlu)
**Paket Yöneticisi:** pnpm workspace
**Runtime:** Node.js 20 LTS

---

## PROJE YAPISI

```
bakim-merkezi/
├── AGENTS.md                        ← Bu dosya (System Agent)
├── apps/
│   ├── web/
│   │   └── AGENTS.md                ← Web Agent
│   └── api/
│       └── AGENTS.md                ← API Agent
├── packages/
│   ├── shared-types/
│   └── validation/
├── tests/
│   └── AGENTS.md                    ← Test Agent
├── security/
│   └── AGENTS.md                    ← Security Agent
├── research/
│   └── AGENTS.md                    ← Researcher Agent
├── src/ui/
│   └── AGENTS.md                    ← UI Agent
└── docs/
```

---

## TEMEL VERİ MODELLERİ

### User (Kullanıcı)
```typescript
interface User {
  id: string;
  email: string;                     // unique
  passwordHash: string;              // bcrypt cost 12
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'EMPLOYEE';
  isActive: boolean;
  createdBy: string;                 // Admin UUID
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;                  // Soft delete
}
```

### Patient (Hasta)
```typescript
interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  gender: 'MALE' | 'FEMALE';
  tcNumber?: string;                 // Şifreli (AES-256)
  careType: 'ELDERLY' | 'DISABLED' | 'BOTH';
  roomNumber?: string;
  admissionDate: Date;
  status: 'ACTIVE' | 'DISCHARGED' | 'TRANSFERRED';
  diagnosis?: string;
  allergies?: string;
  currentMedications?: string;      // Süregelen ilaçlar
  mobilityLevel: 'INDEPENDENT' | 'ASSISTED' | 'BEDRIDDEN';
  dietaryNeeds?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### PatientUpdate (Hasta Güncellemesi)
```typescript
interface PatientUpdate {
  id: string;
  patientId: string;
  employeeId: string;
  updateType: 'MEDICATION' | 'CARE' | 'OBSERVATION' | 'STATUS_CHANGE' | 'VITAL_SIGNS' | 'INCIDENT';
  content: string;                   // Serbest metin
  medicationsGiven?: {
    name: string;
    dosage: string;
    route: string;                   // oral, IV, cilt altı...
    givenAt: Date;
  }[];
  vitalSigns?: {
    bloodPressure?: string;          // "120/80"
    heartRate?: number;              // dk
    temperature?: number;            // °C
    oxygenSaturation?: number;       // %
    weight?: number;                 // kg
    bloodSugar?: number;             // mg/dL
  };
  carePerformed?: string[];          // yapılan bakım işlemleri
  patientMood: 'GOOD' | 'MODERATE' | 'BAD';
  nextActionRequired?: string;
  isUrgent: boolean;
  createdAt: Date;
}
```

### Document (Evrak)
```typescript
interface Document {
  id: string;
  patientId: string;
  uploadedBy: string;
  fileName: string;                  // Orijinal ad
  storedFileName: string;            // UUID tabanlı
  fileSize: number;                  // Byte
  mimeType: string;
  priority: 'RED' | 'YELLOW' | 'GREEN';
  encryptionKey: string;             // AES-256 anahtarı (master key ile şifreli)
  checksum: string;                  // SHA-256
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  uploadedAt: Date;
}
// KURAL: RED evraklar KOD SEVİYESİNDE silinemez — 403 döner
```

### DocumentRetentionPolicy
```typescript
interface DocumentRetentionPolicy {
  id: string;
  priority: 'YELLOW' | 'GREEN';
  retentionDays: number;             // 0 = otomatik silme kapalı
  autoDeleteEnabled: boolean;
  updatedBy: string;
  updatedAt: Date;
}
```

### AuditLog
```typescript
type AuditAction =
  | 'USER_LOGIN' | 'USER_LOGOUT' | 'USER_LOGIN_FAILED'
  | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED'
  | 'PATIENT_CREATED' | 'PATIENT_UPDATED' | 'PATIENT_SEARCHED' | 'PATIENT_VIEWED'
  | 'PATIENT_UPDATE_CREATED'
  | 'DOCUMENT_UPLOADED' | 'DOCUMENT_VIEWED' | 'DOCUMENT_DOWNLOADED'
  | 'DOCUMENT_DELETED' | 'DOCUMENT_PRIORITY_CHANGED'
  | 'RETENTION_POLICY_UPDATED' | 'SETTINGS_CHANGED';

interface AuditLog {
  id: string;
  userId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  performedAt: Date;
}
```

---

## YETKİ MATRİSİ

```
                                    ADMIN     EMPLOYEE
─────────────────────────────────────────────────────
Çalışan oluştur/sil/listele          ✅         ❌
Tüm audit logları gör                ✅         ❌
Tüm hasta güncellemelerini gör       ✅         ❌
Admin dashboard (tam istatistik)     ✅         ❌
Son güncellemeler paneli             ✅         ❌
Tüm hastaları filtrele               ✅         ❌
Silme politikasını ayarla            ✅         ❌
RED evrak sil                        ❌         ❌  ← HİÇKİMSE
YELLOW/GREEN evrak sil               ✅         ❌
─────────────────────────────────────────────────────
Hasta oluştur                        ✅         ✅
Hasta ara/görüntüle                  ✅         ✅
Hasta güncelleme gir                 ✅         ✅
Kendi güncellemelerini gör           ✅         ✅
Evrak yükle                          ✅         ✅
Kendi yüklediğini indir              ✅         ✅
Sınırlı dashboard                    ✅         ✅
```

---

## TECH STACK

### Frontend
Next.js 14, React 18, TypeScript 5, Tailwind CSS 3,
shadcn/ui, React Hook Form 7, Zod 3, TanStack Query 5,
Zustand 4, date-fns 3 (tr locale), Recharts 2, Lucide React, Sonner

### Backend
Node.js 20, Express 4, TypeScript 5, Prisma 5,
PostgreSQL 16, Redis 7, Bull 4, Multer, bcrypt,
jsonwebtoken, MinIO SDK, Node crypto (built-in)

---

## ZORUNLU KOD KURALLARI

1. TypeScript strict — `any` yasak
2. Tüm girdiler Zod ile validate
3. Hata mesajları Türkçe, kullanıcı dostu
4. Soft delete — fiziksel silme sadece MinIO'da
5. Her kritik işlem audit log'a yazılır
6. TC kimlik AES-256 şifreli saklanır
7. Stack trace production'da gösterilmez
8. Commit format: `feat(patients): açıklama`
