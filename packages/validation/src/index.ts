import { z } from "zod";

const turkishNameRegex = /^[a-zA-ZçğıöşüÇĞİÖŞÜ\s'-]+$/;
const phoneRegex = /^(\+90|0)?[1-9]\d{9}$/;
const tcRegex = /^\d{11}$/;

const optionalTrimmed = (max: number) =>
  z.string().max(max).transform((value) => value.trim()).optional();

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid ID")
});

export const patientIdParamSchema = z.object({
  id: z.string().uuid("Invalid resident ID")
});

export const patientUpdateIdParamSchema = z.object({
  id: z.string().uuid("Invalid resident ID"),
  updateId: z.string().uuid("Invalid update ID")
});

export const documentIdParamSchema = z.object({
  id: z.string().uuid("Invalid document ID")
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email").max(255).toLowerCase().trim(),
  password: z.string().min(1, "Password is required")
});

export const demoRequestSchema = z.object({
  institutionName: z.string().min(2, "Facility name is required").max(150).transform((value) => value.trim()),
  contactName: z.string().min(2, "Contact name is required").max(100).transform((value) => value.trim()),
  phone: z.string().regex(phoneRegex, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email").max(255).toLowerCase().trim(),
  message: optionalTrimmed(2000)
});

export const createUserSchema = z.object({
  email: z.string().email("Enter a valid email").max(255).toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  firstName: z.string().min(2).max(50).regex(turkishNameRegex).transform((value) => value.trim()),
  lastName: z.string().min(2).max(50).regex(turkishNameRegex).transform((value) => value.trim()),
  role: z.enum(["ADMIN", "EMPLOYEE"]).default("EMPLOYEE"),
  isActive: z.boolean().default(true)
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial()
  .extend({
    password: z.string().min(8).max(128).optional()
  });

export const userQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(100).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  deleted: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
});

export const createPatientSchema = z.object({
  firstName: z.string().min(2).max(50).regex(turkishNameRegex).transform((value) => value.trim()),
  lastName: z.string().min(2).max(50).regex(turkishNameRegex).transform((value) => value.trim()),
  birthDate: z.coerce.date(),
  gender: z.enum(["MALE", "FEMALE"]),
  tcNumber: z.string().regex(tcRegex, "National ID must be 11 digits").optional(),
  careType: z.enum(["ELDERLY", "DISABLED", "BOTH"]),
  disabilityType: z.enum(["PHYSICAL", "MENTAL", "BOTH"]).optional(),
  roomNumber: z.string().max(20).transform((value) => value.trim()).optional(),
  admissionDate: z.coerce.date(),
  status: z.enum(["ACTIVE", "DISCHARGED", "TRANSFERRED"]).default("ACTIVE"),
  diagnosis: optionalTrimmed(5000),
  allergies: optionalTrimmed(5000),
  currentMedications: optionalTrimmed(5000),
  mobilityLevel: z.enum(["INDEPENDENT", "ASSISTED", "BEDRIDDEN"]),
  dietaryNeeds: optionalTrimmed(5000),
  emergencyContactName: z.string().min(2).max(100).transform((value) => value.trim()),
  emergencyContactPhone: z.string().regex(phoneRegex, "Enter a valid phone number"),
  emergencyContactRelation: z.string().min(2).max(50).transform((value) => value.trim()),
  notes: optionalTrimmed(5000)
});

export const updatePatientSchema = createPatientSchema.partial();

export const patientQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(100).optional(),
  status: z.enum(["ACTIVE", "DISCHARGED", "TRANSFERRED"]).optional(),
  careType: z.enum(["ELDERLY", "DISABLED", "BOTH"]).optional(),
  disabilityType: z.enum(["PHYSICAL", "MENTAL", "BOTH"]).optional(),
  ageGroup: z.enum(["UNDER_65", "OVER_65"]).optional(),
  mobilityLevel: z.enum(["INDEPENDENT", "ASSISTED", "BEDRIDDEN"]).optional(),
  admissionFrom: z.coerce.date().optional(),
  admissionTo: z.coerce.date().optional()
});

export const deletedPatientQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(100).optional()
});

export const documentMatrixQuerySchema = patientQuerySchema.extend({
  // Bu türde evrakı OLMAYAN engellileri getir (eksik evrak filtresi).
  missingTypeId: z.string().uuid().optional(),
  // Matris tüm eşleşen engellileri gösterir; limiti yükseltiyoruz.
  limit: z.coerce.number().int().min(1).max(1000).default(500)
});

export const createPatientUpdateSchema = z.object({
  updateType: z.enum(["MEDICATION", "CARE", "OBSERVATION", "STATUS_CHANGE", "VITAL_SIGNS", "INCIDENT"]),
  content: z.string().min(3, "Description is required").max(5000).transform((value) => value.trim()),
  medicationsGiven: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        dosage: z.string().min(1).max(50),
        route: z.string().min(1).max(50),
        givenAt: z.coerce.date()
      })
    )
    .optional(),
  vitalSigns: z
    .object({
      bloodPressure: z.string().max(20).optional(),
      heartRate: z.number().int().min(20).max(240).optional(),
      temperature: z.number().min(30).max(45).optional(),
      oxygenSaturation: z.number().int().min(50).max(100).optional(),
      weight: z.number().min(1).max(400).optional(),
      bloodSugar: z.number().int().min(20).max(1000).optional()
    })
    .optional(),
  carePerformed: z.array(z.string().min(1).max(100)).default([]),
  patientMood: z.enum(["GOOD", "MODERATE", "BAD"]),
  nextActionRequired: optionalTrimmed(2000),
  isUrgent: z.boolean().default(false)
});

export const updatePatientUpdateSchema = createPatientUpdateSchema.partial();

export const patientUpdateQuerySchema = paginationQuerySchema.extend({
  type: z.enum(["MEDICATION", "CARE", "OBSERVATION", "STATUS_CHANGE", "VITAL_SIGNS", "INCIDENT"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
});

export const recentUpdatesQuerySchema = paginationQuerySchema.extend({
  employeeId: z.string().uuid().optional(),
  type: z.enum(["MEDICATION", "CARE", "OBSERVATION", "STATUS_CHANGE", "VITAL_SIGNS", "INCIDENT"]).optional(),
  updateType: z.enum(["MEDICATION", "CARE", "OBSERVATION", "STATUS_CHANGE", "VITAL_SIGNS", "INCIDENT"]).optional(),
  isUrgent: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
});

export const documentPrioritySchema = z.object({
  priority: z.enum(["RED", "YELLOW", "GREEN"])
});

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

export const documentUploadSchema = documentPrioritySchema.extend({
  // Boş / gönderilmemiş => süresiz.
  expiresAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  documentTypeId: z.preprocess(emptyToUndefined, z.string().uuid().optional())
});

// Yüklenmiş bir evrakın tür + geçerlilik tarihini düzenlemek için.
// expiresAt: null => süresiz yap, undefined => dokunma.
export const documentMetaSchema = z.object({
  documentTypeId: z.string().uuid().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional()
});

export const documentTypeSchema = z.object({
  name: z.string().min(2, "Ad en az 2 karakter").max(120).transform((value) => value.trim()),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional()
});

export const notificationQuerySchema = paginationQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  unreadOnly: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
});

export const auditLogQuerySchema = paginationQuerySchema.extend({
  userId: z.string().uuid().optional(),
  action: z.string().max(100).optional(),
  resourceType: z.string().max(50).optional(),
  category: z.enum(["CARE", "PATIENT", "DOCUMENT", "USER", "LOGIN", "SYSTEM"]).optional(),
  importantOnly: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
});

export const retentionPoliciesSchema = z.object({
  yellow: z.object({
    retentionDays: z.number().int().min(0).max(3650),
    autoDeleteEnabled: z.boolean()
  }),
  green: z.object({
    retentionDays: z.number().int().min(0).max(3650),
    autoDeleteEnabled: z.boolean()
  })
});

export const handoverSummarySchema = z.object({
  hours: z.union([z.literal(12), z.literal(24), z.literal(48)], {
    errorMap: () => ({ message: "Time range must be 12, 24 or 48 hours" })
  })
}).strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type DocumentMetaInput = z.infer<typeof documentMetaSchema>;
export type DocumentTypeInput = z.infer<typeof documentTypeSchema>;
export type CreatePatientUpdateInput = z.infer<typeof createPatientUpdateSchema>;
export type UpdatePatientUpdateInput = z.infer<typeof updatePatientUpdateSchema>;
export type DemoRequestInput = z.infer<typeof demoRequestSchema>;
export type HandoverSummaryInput = z.infer<typeof handoverSummarySchema>;
