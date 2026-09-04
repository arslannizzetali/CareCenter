# ⚙️ API AGENT — Hasta Bakım Merkezi
## apps/api/AGENTS.md | Codex Backend Specialist

---

## AGENT KİMLİĞİ

**Rol:** API Agent
**Sorumluluk:** Express.js REST API, Prisma ORM, servis katmanı, şifreleme, job queue
**Çalışma Dizini:** `apps/api/`

---

## DİZİN YAPISI

```
apps/api/src/
├── app.ts
├── server.ts
├── config/
│   ├── index.ts
│   ├── database.ts               ← Prisma client singleton
│   ├── redis.ts
│   └── storage.ts                ← MinIO client
├── routes/
│   ├── index.ts
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── patient.routes.ts
│   ├── patient-update.routes.ts
│   ├── document.routes.ts
│   └── admin.routes.ts
├── controllers/
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   ├── patient.controller.ts
│   ├── patient-update.controller.ts
│   ├── document.controller.ts
│   └── admin.controller.ts
├── services/
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── patient.service.ts
│   ├── patient-update.service.ts
│   ├── document.service.ts
│   ├── encryption.service.ts     ← AES-256-GCM
│   ├── storage.service.ts        ← MinIO
│   └── audit.service.ts
├── middleware/
│   ├── authenticate.ts
│   ├── authorize.ts
│   ├── validate.ts
│   ├── rate-limit.ts
│   ├── security-headers.ts
│   ├── request-id.ts
│   └── error-handler.ts
├── jobs/
│   ├── queue.ts
│   └── document-retention.job.ts ← Otomatik silme
└── utils/
    ├── api-response.ts
    ├── errors.ts
    ├── pagination.ts
    └── audit-log.ts
```

---

## PRİSMA ŞEMASI

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  EMPLOYEE
}

enum CareType {
  ELDERLY
  DISABLED
  BOTH
}

enum PatientStatus {
  ACTIVE
  DISCHARGED
  TRANSFERRED
}

enum MobilityLevel {
  INDEPENDENT
  ASSISTED
  BEDRIDDEN
}

enum UpdateType {
  MEDICATION
  CARE
  OBSERVATION
  STATUS_CHANGE
  VITAL_SIGNS
  INCIDENT
}

enum PatientMood {
  GOOD
  MODERATE
  BAD
}

enum DocumentPriority {
  RED
  YELLOW
  GREEN
}

model User {
  id              String    @id @default(uuid())
  email           String    @unique @db.VarChar(255)
  passwordHash    String    @map("password_hash")
  firstName       String    @map("first_name") @db.VarChar(50)
  lastName        String    @map("last_name") @db.VarChar(50)
  role            Role      @default(EMPLOYEE)
  isActive        Boolean   @default(true) @map("is_active")
  createdById     String?   @map("created_by_id")
  createdBy       User?     @relation("CreatedByUser", fields: [createdById], references: [id])
  createdUsers    User[]    @relation("CreatedByUser")
  lastLoginAt     DateTime? @map("last_login_at")
  lastLoginIp     String?   @map("last_login_ip") @db.VarChar(45)
  patientUpdates  PatientUpdate[]
  documents       Document[]
  auditLogs       AuditLog[]
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  @@index([email])
  @@map("users")
}

model Patient {
  id                      String          @id @default(uuid())
  firstName               String          @map("first_name") @db.VarChar(50)
  lastName                String          @map("last_name") @db.VarChar(50)
  birthDate               DateTime        @map("birth_date")
  gender                  String          @db.VarChar(10)
  tcNumberEncrypted       String?         @map("tc_number_encrypted") // AES-256 şifreli
  careType                CareType        @map("care_type")
  roomNumber              String?         @map("room_number") @db.VarChar(20)
  admissionDate           DateTime        @map("admission_date")
  status                  PatientStatus   @default(ACTIVE)
  diagnosis               String?         @db.Text
  allergies               String?         @db.Text
  currentMedications      String?         @map("current_medications") @db.Text
  mobilityLevel           MobilityLevel   @map("mobility_level")
  dietaryNeeds            String?         @map("dietary_needs") @db.Text
  emergencyContactName    String          @map("emergency_contact_name") @db.VarChar(100)
  emergencyContactPhone   String          @map("emergency_contact_phone") @db.VarChar(15)
  emergencyContactRelation String         @map("emergency_contact_relation") @db.VarChar(50)
  notes                   String?         @db.Text
  createdById             String          @map("created_by_id")
  createdBy               User            @relation(fields: [createdById], references: [id])
  patientUpdates          PatientUpdate[]
  documents               Document[]
  createdAt               DateTime        @default(now()) @map("created_at")
  updatedAt               DateTime        @updatedAt @map("updated_at")
  deletedAt               DateTime?       @map("deleted_at")

  @@index([firstName, lastName])
  @@index([status])
  @@index([careType])
  @@index([roomNumber])
  @@map("patients")
}

model PatientUpdate {
  id                  String      @id @default(uuid())
  patientId           String      @map("patient_id")
  patient             Patient     @relation(fields: [patientId], references: [id])
  employeeId          String      @map("employee_id")
  employee            User        @relation(fields: [employeeId], references: [id])
  updateType          UpdateType  @map("update_type")
  content             String      @db.Text
  medicationsGiven    Json?       @map("medications_given")  // MedicationEntry[]
  vitalSigns          Json?       @map("vital_signs")        // VitalSigns
  carePerformed       String[]    @map("care_performed")
  patientMood         PatientMood @map("patient_mood")
  nextActionRequired  String?     @map("next_action_required") @db.Text
  isUrgent            Boolean     @default(false) @map("is_urgent")
  createdAt           DateTime    @default(now()) @map("created_at")

  @@index([patientId, createdAt(sort: Desc)])
  @@index([employeeId])
  @@index([isUrgent])
  @@index([createdAt(sort: Desc)])
  @@map("patient_updates")
}

model Document {
  id              String           @id @default(uuid())
  patientId       String           @map("patient_id")
  patient         Patient          @relation(fields: [patientId], references: [id])
  uploadedById    String           @map("uploaded_by_id")
  uploadedBy      User             @relation(fields: [uploadedById], references: [id])
  fileName        String           @map("file_name") @db.VarChar(255)
  storedFileName  String           @map("stored_file_name") @db.VarChar(255)
  fileSize        BigInt           @map("file_size")
  mimeType        String           @map("mime_type") @db.VarChar(100)
  priority        DocumentPriority
  encryptionKey   String           @map("encryption_key") // AES key, master key ile şifreli
  checksum        String           @db.VarChar(64)        // SHA-256
  isDeleted       Boolean          @default(false) @map("is_deleted")
  deletedAt       DateTime?        @map("deleted_at")
  deletedById     String?          @map("deleted_by_id")
  uploadedAt      DateTime         @default(now()) @map("uploaded_at")

  @@index([patientId, isDeleted])
  @@index([uploadedById])
  @@index([priority])
  @@map("documents")
}

model DocumentRetentionPolicy {
  id                String   @id @default(uuid())
  priority          String   @unique @db.VarChar(10)  // YELLOW | GREEN
  retentionDays     Int      @map("retention_days")
  autoDeleteEnabled Boolean  @map("auto_delete_enabled")
  updatedById       String   @map("updated_by_id")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("document_retention_policies")
}

model AuditLog {
  id           String   @id @default(uuid())
  userId       String?  @map("user_id")
  user         User?    @relation(fields: [userId], references: [id])
  action       String   @db.VarChar(100)
  resourceType String   @map("resource_type") @db.VarChar(50)
  resourceId   String   @map("resource_id")
  metadata     Json?
  ipAddress    String   @map("ip_address") @db.VarChar(45)
  userAgent    String?  @map("user_agent")
  performedAt  DateTime @default(now()) @map("performed_at")

  @@index([userId])
  @@index([action])
  @@index([performedAt(sort: Desc)])
  @@map("audit_logs")
}
```

---

## ŞİFRELEME SERVİSİ

```typescript
// apps/api/src/services/encryption.service.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const MASTER_KEY = Buffer.from(process.env.MASTER_ENCRYPTION_KEY!, 'hex'); // 32 byte

export class EncryptionService {
  // Dosya şifreleme — her dosya için ayrı anahtar
  encryptFile(buffer: Buffer): {
    encrypted: Buffer;
    key: string;        // Şifreli anahtar (DB'ye kaydedilecek)
    iv: string;
    authTag: string;
    checksum: string;
  } {
    // 1. Orijinal dosyanın checksum'ı
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // 2. Dosyaya özgü rastgele anahtar
    const fileKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    // 3. Dosyayı şifrele
    const cipher = crypto.createCipheriv(ALGORITHM, fileKey, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // 4. Dosya anahtarını master key ile şifrele
    const keyIv = crypto.randomBytes(16);
    const keyCipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, keyIv);
    const encryptedKey = Buffer.concat([keyCipher.update(fileKey), keyCipher.final()]);
    const keyAuthTag = keyCipher.getAuthTag();

    return {
      encrypted,
      key: JSON.stringify({
        key: encryptedKey.toString('hex'),
        iv: keyIv.toString('hex'),
        authTag: keyAuthTag.toString('hex'),
      }),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      checksum,
    };
  }

  // Dosya çözme
  decryptFile(encrypted: Buffer, encryptionKey: string, iv: string, authTag: string): Buffer {
    // 1. Dosya anahtarını çöz
    const keyData = JSON.parse(encryptionKey);
    const keyDecipher = crypto.createDecipheriv(
      ALGORITHM,
      MASTER_KEY,
      Buffer.from(keyData.iv, 'hex')
    );
    keyDecipher.setAuthTag(Buffer.from(keyData.authTag, 'hex'));
    const fileKey = Buffer.concat([
      keyDecipher.update(Buffer.from(keyData.key, 'hex')),
      keyDecipher.final(),
    ]);

    // 2. Dosyayı çöz
    const decipher = crypto.createDecipheriv(ALGORITHM, fileKey, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  // TC kimlik şifreleme (deterministik — arama yapılabilsin)
  encryptTc(tc: string): string {
    const iv = Buffer.alloc(16, 0); // Sabit IV — arama için
    const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(tc, 'utf8'), cipher.final()]);
    return encrypted.toString('hex');
  }

  decryptTc(encrypted: string): string {
    const iv = Buffer.alloc(16, 0);
    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
    decipher.setAuthTag(Buffer.alloc(16)); // TC için auth tag yok (deterministik)
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'hex')),
    ]).toString('utf8');
  }
}
```

---

## API ENDPOINT LİSTESİ

```
AUTH
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
GET  /api/v1/auth/me

KULLANICI YÖNETİMİ (Sadece Admin)
GET    /api/v1/users               ?search=&isActive=&page=&limit=
POST   /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

HASTALAR
GET    /api/v1/patients            ?search=&status=&careType=&page=&limit=
POST   /api/v1/patients
GET    /api/v1/patients/:id
PATCH  /api/v1/patients/:id
DELETE /api/v1/patients/:id        (Sadece Admin)

HASTA GÜNCELLEMELERİ
GET  /api/v1/patients/:id/updates  ?type=&from=&to=&page=
     Admin: hepsi | Çalışan: sadece kendi yazdıkları
POST /api/v1/patients/:id/updates
GET  /api/v1/patient-updates/recent
     Admin: tüm son güncellemeler | Çalışan: kendi son güncellemeleri

EVRAKLAR
POST   /api/v1/patients/:id/documents      Yükle (multipart)
GET    /api/v1/patients/:id/documents      Liste (priority'e göre gruplu)
GET    /api/v1/documents/:id/download      İndir (stream)
PATCH  /api/v1/documents/:id/priority      (Sadece Admin)
DELETE /api/v1/documents/:id               (Sadece Admin, RED için 403)

ADMIN PANELİ
GET /api/v1/admin/dashboard-stats          Özet istatistikler
GET /api/v1/admin/recent-updates           Son hasta güncellemeleri (tüm çalışanlar)
GET /api/v1/admin/audit-logs              ?userId=&action=&from=&to=&page=
GET /api/v1/admin/patients                ?search=&status=&careType=&page= (admin filtreli)
GET /api/v1/admin/retention-policies
PATCH /api/v1/admin/retention-policies
```

---

## ROUTE → CONTROLLER → SERVICE PATTERN

Her modül bu 3 katmanı izler. İş mantığı controller'da olmamalıdır.

```typescript
// CONTROLLER — sadece req/res + service çağrısı
export class PatientUpdateController {
  private service = new PatientUpdateService();

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const update = await this.service.create(
        req.params.patientId,
        req.body,
        req.user!
      );
      created(res, update);
    } catch (error) {
      next(error);
    }
  };

  listForPatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updates = await this.service.listForPatient(
        req.params.patientId,
        req.query,
        req.user!
      );
      ok(res, updates.data, { pagination: updates.pagination });
    } catch (error) {
      next(error);
    }
  };
}

// SERVICE — iş mantığı
export class PatientUpdateService {
  async create(patientId: string, dto: CreatePatientUpdateDto, requester: AuthUser) {
    // Hasta var mı kontrolü
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
    });
    if (!patient) throw new NotFoundError('PATIENT_NOT_FOUND', 'Hasta bulunamadı');

    const update = await prisma.patientUpdate.create({
      data: {
        patientId,
        employeeId: requester.id,
        ...dto,
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });

    await auditLog.write({
      userId: requester.id,
      action: 'PATIENT_UPDATE_CREATED',
      resourceType: 'PatientUpdate',
      resourceId: update.id,
      metadata: { patientId, updateType: dto.updateType, isUrgent: dto.isUrgent },
      ipAddress: requester.ip,
    });

    return update;
  }

  async listForPatient(patientId: string, query: QueryParams, requester: AuthUser) {
    const where: Prisma.PatientUpdateWhereInput = {
      patientId,
      // Çalışan sadece kendi yazdıklarını görebilir
      ...(requester.role === 'EMPLOYEE' && { employeeId: requester.id }),
      ...(query.type && { updateType: query.type }),
      ...(query.from && { createdAt: { gte: new Date(query.from) } }),
    };
    // ... pagination
  }
}
```

---

## OTOMATİK SİLME JOB'I

```typescript
// apps/api/src/jobs/document-retention.job.ts
// Her gece 02:00 Europe/Istanbul

retentionQueue.process(async () => {
  const policies = await prisma.documentRetentionPolicy.findMany({
    where: { autoDeleteEnabled: true },
  });

  for (const policy of policies) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    const docsToDelete = await prisma.document.findMany({
      where: {
        priority: policy.priority as DocumentPriority,
        isDeleted: false,
        uploadedAt: { lte: cutoffDate },
        // RED evraklara ASLA dokunma
      },
    });

    for (const doc of docsToDelete) {
      // MinIO'dan fiziksel sil
      await storageService.deleteFile(doc.storedFileName);

      // DB'de soft delete
      await prisma.document.update({
        where: { id: doc.id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      // Audit log
      await auditLog.write({
        action: 'DOCUMENT_DELETED',
        resourceType: 'Document',
        resourceId: doc.id,
        metadata: { reason: 'AUTO_DELETE', policy: policy.priority, retentionDays: policy.retentionDays },
        ipAddress: 'system',
      });
    }
  }
});
```

---

## CODEX NOTLARI

1. Her route'ta authenticate + authorize middleware zorunlu
2. Her endpoint için Zod validation şeması yaz
3. RED evrak silme isteği gelince service seviyesinde 403 fırlat — sadece UI'da saklamak yetmez
4. TC kimlik alanı asla plain-text DB'ye yazılmayacak
5. Dosya indirme audit log'a yazılacak (kim, ne zaman, hangi dosya)
6. Admin endpoint'leri /admin/ prefix'i altında, ayrı authorize(ADMIN) middleware'i
7. `recent-updates` endpoint'i pagination ile çalışacak, max 50 kayıt sayfa başına
8. Çalışan kendi yazdığı güncellemeyi düzenleyemez (sadece oluşturabilir)
