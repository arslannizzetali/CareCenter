import type { CareType, DocumentPriority, MobilityLevel, PatientMood, PatientStatus, Role, UpdateType } from "@bakimevi/shared-types";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive?: boolean;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: "MALE" | "FEMALE";
  careType: CareType;
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

export interface DocumentItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  priority: DocumentPriority;
  uploadedAt: string;
  uploadedBy: { id: string; firstName: string; lastName: string };
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
