import { z } from "zod";

const turkishNameRegex = /^[a-zA-ZçğıöşüÇĞİÖŞÜ\s'-]+$/;
const phoneRegex = /^(\+90|0)?[1-9]\d{9}$/;
const tcRegex = /^\d{11}$/;

const optionalTrimmed = (max: number) =>
  z.string().max(max).transform((value) => value.trim()).optional();

export const idParamSchema = z.object({
  id: z.string().uuid("Geçersiz ID")
});

export const patientIdParamSchema = z.object({
  id: z.string().uuid("Geçersiz hasta ID")
});

export const documentIdParamSchema = z.object({
  id: z.string().uuid("Geçersiz evrak ID")
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli e-posta giriniz").max(255).toLowerCase().trim(),
  password: z.string().min(1, "Şifre zorunludur")
});

export const demoRequestSchema = z.object({
  institutionName: z.string().min(2, "Kurum adı zorunludur").max(150).transform((value) => value.trim()),
  contactName: z.string().min(2, "Yetkili adı zorunludur").max(100).transform((value) => value.trim()),
  phone: z.string().regex(phoneRegex, "Geçerli telefon numarası giriniz"),
  email: z.string().email("Geçerli e-posta giriniz").max(255).toLowerCase().trim(),
  message: optionalTrimmed(2000)
});

export const createUserSchema = z.object({
  email: z.string().email("Geçerli e-posta giriniz").max(255).toLowerCase().trim(),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır").max(128),
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
    .optional()
});

export const createPatientSchema = z.object({
  firstName: z.string().min(2).max(50).regex(turkishNameRegex).transform((value) => value.trim()),
  lastName: z.string().min(2).max(50).regex(turkishNameRegex).transform((value) => value.trim()),
  birthDate: z.coerce.date(),
  gender: z.enum(["MALE", "FEMALE"]),
  tcNumber: z.string().regex(tcRegex, "TC kimlik 11 rakam olmalıdır").optional(),
  careType: z.enum(["ELDERLY", "DISABLED", "BOTH"]),
  roomNumber: z.string().max(20).transform((value) => value.trim()).optional(),
  admissionDate: z.coerce.date(),
  status: z.enum(["ACTIVE", "DISCHARGED", "TRANSFERRED"]).default("ACTIVE"),
  diagnosis: optionalTrimmed(5000),
  allergies: optionalTrimmed(5000),
  currentMedications: optionalTrimmed(5000),
  mobilityLevel: z.enum(["INDEPENDENT", "ASSISTED", "BEDRIDDEN"]),
  dietaryNeeds: optionalTrimmed(5000),
  emergencyContactName: z.string().min(2).max(100).transform((value) => value.trim()),
  emergencyContactPhone: z.string().regex(phoneRegex, "Geçerli telefon numarası giriniz"),
  emergencyContactRelation: z.string().min(2).max(50).transform((value) => value.trim()),
  notes: optionalTrimmed(5000)
});

export const updatePatientSchema = createPatientSchema.partial();

export const patientQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(100).optional(),
  status: z.enum(["ACTIVE", "DISCHARGED", "TRANSFERRED"]).optional(),
  careType: z.enum(["ELDERLY", "DISABLED", "BOTH"]).optional(),
  mobilityLevel: z.enum(["INDEPENDENT", "ASSISTED", "BEDRIDDEN"]).optional(),
  admissionFrom: z.coerce.date().optional(),
  admissionTo: z.coerce.date().optional()
});

export const createPatientUpdateSchema = z.object({
  updateType: z.enum(["MEDICATION", "CARE", "OBSERVATION", "STATUS_CHANGE", "VITAL_SIGNS", "INCIDENT"]),
  content: z.string().min(3, "Açıklama zorunludur").max(5000).transform((value) => value.trim()),
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

export const auditLogQuerySchema = paginationQuerySchema.extend({
  userId: z.string().uuid().optional(),
  action: z.string().max(100).optional(),
  resourceType: z.string().max(50).optional(),
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

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type CreatePatientUpdateInput = z.infer<typeof createPatientUpdateSchema>;
export type DemoRequestInput = z.infer<typeof demoRequestSchema>;
