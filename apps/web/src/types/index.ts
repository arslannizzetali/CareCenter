import type {
  CareType,
  DisabilityType,
  DocumentPriority,
  MobilityLevel,
  PatientMood,
  PatientStatus,
  Role,
  UpdateType
} from "@bakimevi/shared-types";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  deletedAt?: string | null;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: "MALE" | "FEMALE";
  careType: CareType;
  disabilityType?: DisabilityType | null;
  roomNumber?: string;
  admissionDate: string;
  status: PatientStatus;
  diagnosis?: string;
  allergies?: string;
  currentMedications?: string;
  mobilityLevel: MobilityLevel;
  dietaryNeeds?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  notes?: string;
  documentCounts?: { red: number; yellow: number; green: number };
  patientUpdates?: PatientUpdate[];
  deletedAt?: string | null;
}

export interface PatientUpdate {
  id: string;
  updateType: UpdateType;
  content: string;
  medicationsGiven?: unknown;
  vitalSigns?: unknown;
  carePerformed: string[];
  patientMood: PatientMood;
  nextActionRequired?: string;
  isUrgent: boolean;
  createdAt: string;
  summary?: string;
  employee: { id: string; firstName: string; lastName: string };
  patient?: { id: string; firstName: string; lastName: string; roomNumber?: string };
}

export type ExpiryStatus = "RED" | "YELLOW" | "GREEN";

export interface DocumentType {
  id: string;
  name: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface DocumentItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  priority: DocumentPriority;
  expiresAt?: string | null;
  expiryStatus?: ExpiryStatus | null;
  daysUntilExpiry?: number | null;
  remainingLabel?: string;
  documentType?: { id: string; name: string } | null;
  uploadedAt: string;
  uploadedBy: { id: string; firstName: string; lastName: string };
}

export interface DocumentMatrixCell {
  documentId: string;
  fileName: string;
  expiresAt: string | null;
  expiryStatus: ExpiryStatus | null;
  remainingLabel: string;
  daysUntilExpiry: number | null;
}

export interface DocumentMatrixRow {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    roomNumber?: string | null;
    careType: CareType;
    disabilityType?: DisabilityType | null;
    birthDate: string;
    status: PatientStatus;
  };
  cells: Record<string, DocumentMatrixCell | null>;
}

export interface DocumentMatrix {
  types: Array<{ id: string; name: string }>;
  rows: DocumentMatrixRow[];
}

export interface PatientDocTypeStatus {
  typeId: string;
  typeName: string;
  document: DocumentMatrixCell | null;
}

export interface AppNotification {
  id: string;
  type: "DOCUMENT_EXPIRING";
  title: string;
  body: string;
  patientId?: string | null;
  documentId?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export type AuditCategory = "CARE" | "PATIENT" | "DOCUMENT" | "USER" | "LOGIN" | "SYSTEM";

export interface AuditLogEntry {
  id: string;
  performedAt: string;
  action: string;
  category: AuditCategory;
  isUrgent: boolean;
  actorName: string;
  actorRole: "ADMIN" | "EMPLOYEE" | null;
  description: string;
  ipAddress: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    timestamp: string;
    requestId: string;
  };
}
