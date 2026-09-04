# 🔐 SECURITY AGENT — Bakım Merkezi WebApp
## security/AGENTS.md | Codex Security Specialist

---

## AGENT KİMLİĞİ

**Rol:** Security Agent  
**Sorumluluk:** Kimlik doğrulama, yetkilendirme, veri güvenliği, güvenlik açığı tespiti ve önleme  
**Çalışma Dizini:** `apps/api/`, `apps/web/`, `packages/`  
**Öncelik:** CRITICAL — Güvenlik açıkları her şeyin önünde gelir

---

## GÖREVLERİM

Bu agent aşağıdaki görevlerden sorumludur:

1. **Authentication sistemi** — JWT tabanlı access/refresh token akışı
2. **Authorization middleware** — Role-Based Access Control (RBAC)
3. **Input validation** — Tüm API girdilerinin doğrulanması
4. **Rate limiting** — Brute force ve DDoS koruması
5. **Güvenlik header'ları** — CORS, CSP, HSTS ayarları
6. **Veri maskeleme** — Hassas veri ifşasının önlenmesi
7. **Güvenlik audit'i** — Mevcut kodda açık taraması
8. **Dependency güvenliği** — npm audit, CVE takibi
9. **Şifreleme** — At-rest ve in-transit şifreleme

---

## KİMLİK DOĞRULAMA MİMARİSİ

### JWT Token Akışı
```
[Client] ──POST /auth/login──► [API]
                                 │
                    ┌────────────┘
                    │ 1. Şifre doğrula (bcrypt.compare)
                    │ 2. Access Token üret (15 dakika)
                    │ 3. Refresh Token üret (7 gün)
                    │ 4. Refresh Token → Redis'e kaydet
                    │ 5. Refresh Token → HttpOnly Cookie
                    └────────────────────────────────────►
                    
[Client] ──Bearer Token──► [API Endpoint]
                             │
                ┌────────────┘
                │ 1. Token imzasını doğrula
                │ 2. Expiry kontrol et
                │ 3. Blacklist kontrol et (Redis)
                │ 4. Role/permission kontrol et
                └──────────────────────────────► [Controller]
```

### Token İmplementasyonu
```typescript
// packages/auth/src/tokens.ts
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

interface AccessTokenPayload {
  sub: string;           // User ID
  role: Role;
  permissions: string[];
  jti: string;           // JWT ID (blacklist için)
  iat: number;
  exp: number;
}

interface RefreshTokenPayload {
  sub: string;
  tokenFamily: string;   // Token rotation için
  jti: string;
  iat: number;
  exp: number;
}

export class TokenService {
  generateAccessToken(userId: string, role: Role, permissions: string[]): string {
    return jwt.sign(
      {
        sub: userId,
        role,
        permissions,
        jti: uuidv4(),
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: '15m',
        issuer: 'bakimpro-api',
        audience: 'bakimpro-web',
        algorithm: 'HS256',  // Production'da RS256 tercih et
      }
    );
  }

  generateRefreshToken(userId: string, tokenFamily: string): string {
    return jwt.sign(
      {
        sub: userId,
        tokenFamily,
        jti: uuidv4(),
      },
      process.env.JWT_REFRESH_SECRET!,
      {
        expiresIn: '7d',
        issuer: 'bakimpro-api',
        algorithm: 'HS256',
      }
    );
  }

  // Token rotation — her refresh'te yeni token family oluştur
  async rotateRefreshToken(oldToken: string): Promise<TokenPair> {
    const payload = this.verifyRefreshToken(oldToken);
    
    // Eski token'ı blacklist'e al
    await this.blacklistToken(payload.jti, payload.exp);
    
    // Token theft detection — family blacklist
    const isStolen = await this.checkTokenFamily(payload.tokenFamily);
    if (isStolen) {
      await this.revokeTokenFamily(payload.tokenFamily);
      throw new SecurityError('TOKEN_REUSE_DETECTED', 'Tüm oturumlar sonlandırıldı');
    }
    
    return this.generateTokenPair(payload.sub, payload.role);
  }
}
```

---

## AUTHORIZATION (RBAC)

### Permission Middleware
```typescript
// apps/api/src/middleware/authorize.ts

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // authMiddleware tarafından set edilmiş olmalı
    
    if (!user) {
      return res.status(401).json(createError('UNAUTHORIZED', 'Giriş yapmalısınız'));
    }

    // Super admin her şeye erişebilir
    if (user.role === 'super_admin') {
      return next();
    }

    // Permission kontrol
    const hasPermission = checkPermission(user.role, permission);
    if (!hasPermission) {
      // Audit log yaz
      await auditLog.write({
        userId: user.id,
        action: 'PERMISSION_DENIED',
        resource: req.path,
        permission,
        ip: getClientIp(req),
      });
      
      return res.status(403).json(createError('FORBIDDEN', 'Bu işlem için yetkiniz yok'));
    }

    next();
  };
}

// Kaynak sahibi kontrolü — müşteri kendi verisine erişebilir
export function requireOwnership(resourceGetter: (req: Request) => Promise<string>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    
    // Admin ve manager tüm kaynaklara erişebilir
    if (['super_admin', 'admin', 'manager'].includes(user.role)) {
      return next();
    }

    const ownerId = await resourceGetter(req);
    if (ownerId !== user.id) {
      return res.status(403).json(createError('FORBIDDEN', 'Bu kaynağa erişim yetkiniz yok'));
    }

    next();
  };
}
```

---

## INPUT VALIDATION (ZOD ŞEMAları)

Her API endpoint'i için Zod şeması zorunludur. Hiçbir raw input controller'a ulaşmamalıdır.

```typescript
// packages/validation/src/schemas/customer.ts
import { z } from 'zod';

const turkishPhoneRegex = /^(\+90|0)?[1-9]\d{9}$/;
const turkishPlateRegex = /^[0-9]{2}\s?[A-Z]{1,3}\s?[0-9]{2,4}$/;

export const CreateCustomerSchema = z.object({
  firstName: z
    .string()
    .min(2, 'Ad en az 2 karakter olmalıdır')
    .max(50, 'Ad en fazla 50 karakter olabilir')
    .regex(/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s]+$/, 'Ad sadece harf içerebilir')
    .transform(s => s.trim()),
    
  lastName: z
    .string()
    .min(2, 'Soyad en az 2 karakter olmalıdır')
    .max(50, 'Soyad en fazla 50 karakter olabilir')
    .regex(/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s]+$/, 'Soyad sadece harf içerebilir')
    .transform(s => s.trim()),

  email: z
    .string()
    .email('Geçerli bir e-posta adresi giriniz')
    .max(255)
    .toLowerCase()
    .trim(),

  phone: z
    .string()
    .regex(turkishPhoneRegex, 'Geçerli bir Türkiye telefon numarası giriniz'),

  notes: z
    .string()
    .max(1000, 'Not en fazla 1000 karakter olabilir')
    .optional()
    .transform(s => s?.trim()),
});

export const CreateVehicleSchema = z.object({
  plate: z
    .string()
    .regex(turkishPlateRegex, 'Geçerli bir Türk plakası giriniz')
    .transform(s => s.toUpperCase().replace(/\s/g, '')),

  vin: z
    .string()
    .length(17, 'VIN numarası tam olarak 17 karakter olmalıdır')
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Geçersiz VIN formatı')
    .toUpperCase(),

  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),

  mileage: z
    .number()
    .int()
    .min(0)
    .max(9_999_999),
});

// Validation middleware factory
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Girilen bilgiler hatalı',
          details: errors,
        },
      });
    }
    
    req.body = result.data; // Sanitized data
    next();
  };
}
```

---

## RATE LIMITING

```typescript
// apps/api/src/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';

// Genel API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,     // 15 dakika
  max: 100,                       // Max 100 istek
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ client: redis, prefix: 'rl:api:' }),
  message: { 
    success: false, 
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Çok fazla istek gönderdiniz' } 
  },
});

// Auth endpoint'leri için daha sıkı limit
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,     // 15 dakika
  max: 5,                         // Max 5 başarısız deneme
  skipSuccessfulRequests: true,   // Başarılı istekleri sayma
  store: new RedisStore({ client: redis, prefix: 'rl:auth:' }),
  keyGenerator: (req) => `${req.ip}:${req.body?.email}`, // IP + email kombinasyonu
  message: {
    success: false,
    error: { 
      code: 'TOO_MANY_ATTEMPTS', 
      message: 'Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin.' 
    }
  },
});

// Şifre sıfırlama limiti
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,     // 1 saat
  max: 3,
  store: new RedisStore({ client: redis, prefix: 'rl:reset:' }),
});

// SMS gönderme limiti (maliyet kontrolü)
export const smsLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 saat
  max: 10,
  store: new RedisStore({ client: redis, prefix: 'rl:sms:' }),
});
```

---

## GÜVENLİK HEADER'LARI

```typescript
// apps/api/src/middleware/security-headers.ts
import helmet from 'helmet';
import cors from 'cors';

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],  // Next.js için gerekli
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", process.env.S3_ENDPOINT!],
        connectSrc: ["'self'", process.env.API_URL!],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,          // 1 yıl
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),

  cors({
    origin: (origin, callback) => {
      const allowed = process.env.ALLOWED_ORIGINS?.split(',') ?? [];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: ${origin} izin verilmedi`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
    maxAge: 600,                 // 10 dakika preflight cache
  }),
];
```

---

## VERİ MASKELEME

Hassas veriler asla tam olarak döndürülmemelidir.

```typescript
// packages/shared-types/src/sanitizers.ts

export function maskPhone(phone: string): string {
  // "05551234567" → "0555***4567"
  return phone.replace(/(\d{4})\d{3}(\d{4})/, '$1***$2');
}

export function maskEmail(email: string): string {
  // "user@example.com" → "us**@example.com"
  const [local, domain] = email.split('@');
  const masked = local.slice(0, 2) + '*'.repeat(local.length - 2);
  return `${masked}@${domain}`;
}

export function maskCardNumber(card: string): string {
  return `**** **** **** ${card.slice(-4)}`;
}

// Response transformer — tüm API yanıtlarında kullan
export function sanitizeCustomerForResponse(customer: Customer, requesterRole: Role): CustomerResponse {
  const base = {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    vehicles: customer.vehicles,
    createdAt: customer.createdAt,
  };

  // Hassas alanlar sadece yüksek yetkili roller için
  if (['admin', 'manager', 'receptionist'].includes(requesterRole)) {
    return {
      ...base,
      email: customer.email,
      phone: customer.phone,
    };
  }

  return {
    ...base,
    email: maskEmail(customer.email),
    phone: maskPhone(customer.phone),
  };
}
```

---

## SQL INJECTION KORUMASI

```typescript
// ASLA string concatenation ile query oluşturma
// ❌ YANLIŞ
const result = await db.query(`SELECT * FROM customers WHERE email = '${email}'`);

// ✅ DOĞRU — Prisma ORM kullan
const result = await prisma.customer.findUnique({
  where: { email },  // Prisma parametrize eder
});

// ✅ Raw query gerekiyorsa parametrize kullan
const result = await prisma.$queryRaw`
  SELECT * FROM customers WHERE email = ${email} AND deleted_at IS NULL
`;
```

---

## DOSYA YÜKLEME GÜVENLİĞİ

```typescript
// apps/api/src/middleware/file-upload.ts
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),  // Disk'e yazma — doğrudan MinIO'ya yükle
  
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,                        // Max 5 dosya aynı anda
  },
  
  fileFilter: (req, file, cb) => {
    // MIME type kontrolü
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Desteklenmeyen dosya türü: ${file.mimetype}`));
    }
    
    // Dosya uzantısı kontrolü — MIME spoofing önlemi
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Geçersiz dosya uzantısı'));
    }
    
    cb(null, true);
  },
});

// Dosya adı randomize et — path traversal önlemi
export function sanitizeFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return `${uuidv4()}${ext}`;  // Orijinal adı hiçbir zaman kullanma
}
```

---

## AUDIT LOGGING

Tüm kritik işlemler audit log'a yazılmalıdır.

```typescript
// apps/api/src/services/audit-log.service.ts

interface AuditEvent {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip: string;
  userAgent?: string;
  success: boolean;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_LOGIN_FAILED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PERMISSION_DENIED'
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_UPDATED'
  | 'CUSTOMER_DELETED'
  | 'INVOICE_CREATED'
  | 'INVOICE_PAID'
  | 'DATA_EXPORTED'
  | 'SETTINGS_CHANGED'
  | 'ROLE_CHANGED'
  | 'TOKEN_REUSE_DETECTED';

class AuditLogService {
  async write(event: AuditEvent): Promise<void> {
    // PostgreSQL'e yaz (async — performansı etkileme)
    await prisma.auditLog.create({ data: event });
    
    // Kritik olaylar için anlık alert
    if (this.isCritical(event.action)) {
      await this.sendSecurityAlert(event);
    }
  }
  
  private isCritical(action: AuditAction): boolean {
    return [
      'TOKEN_REUSE_DETECTED',
      'PERMISSION_DENIED',
      'USER_LOGIN_FAILED',
    ].includes(action);
  }
}
```

---

## GÜVENLİK KONTROL LİSTESİ

Bu agent bir değişiklik yapmadan önce aşağıdakileri kontrol etmelidir:

### Authentication
- [ ] Şifreler bcrypt ile hashleniyor (minimum cost factor: 12)
- [ ] Access token süresi 15 dakika veya daha az
- [ ] Refresh token rotation uygulanmış
- [ ] Token blacklist Redis'te tutuluyor
- [ ] Çıkış yapınca tüm token'lar geçersiz kılınıyor
- [ ] "Beni hatırla" özelliği güvenli HttpOnly cookie kullanıyor

### Authorization
- [ ] Her endpoint için RBAC uygulanmış
- [ ] Kaynak sahipliği kontrol ediliyor (müşteri kendi verisine erişiyor mu?)
- [ ] Horizontal privilege escalation engellenmiş

### Input Validation
- [ ] Tüm girdiler Zod ile validate ediliyor
- [ ] SQL injection için parameterized query kullanılıyor
- [ ] XSS için çıktılar sanitize ediliyor
- [ ] Path traversal önlemi alınmış
- [ ] Dosya boyutu ve türü kontrol ediliyor

### API Güvenliği
- [ ] Rate limiting uygulanmış
- [ ] CORS doğru yapılandırılmış
- [ ] Güvenlik header'ları aktif
- [ ] HTTPS zorunlu
- [ ] API versiyonlama var (/api/v1)

### Veri Güvenliği
- [ ] Hassas veriler maskelenmiş
- [ ] .env dosyası .gitignore'da
- [ ] Secret'lar kodda hard-coded değil
- [ ] Audit log aktif
- [ ] Soft delete uygulanmış (veriler kaybolmuyor)

---

## BAĞIMLILIK GÜVENLİĞİ

Bu agent periyodik olarak çalıştırmalıdır:

```bash
# Güvenlik açığı taraması
pnpm audit --audit-level=moderate

# Kritik açıkları otomatik düzelt
pnpm audit fix

# Outdated paketleri listele
pnpm outdated

# Lisans kontrolü (GPL kodu kullanmaktan kaçın)
npx license-checker --excludePrivatePackages --failOn "GPL"
```

---

## CODEX NOTLARI

Bu agent çalışırken:

1. **Asla** plaintext şifre loglama
2. **Asla** JWT secret'ı response'a ekleme
3. **Asla** stack trace'i production'da kullanıcıya gösterme
4. **Her zaman** fail-secure prensibi — hata durumunda erişimi reddet
5. Security değişikliği yapınca **mutlaka** Test Agent'a bildir
6. Kritik güvenlik düzeltmeleri için commit mesajında `security:` prefix kullan
7. CVE bulunan bağımlılıklar için **aynı gün** güncelleme yap
