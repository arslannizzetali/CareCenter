export type Role = "ADMIN" | "EMPLOYEE";
export type CareType = "ELDERLY" | "DISABLED" | "BOTH";
export type DisabilityType = "PHYSICAL" | "MENTAL" | "BOTH";
export type PatientStatus = "ACTIVE" | "DISCHARGED" | "TRANSFERRED";
export type MobilityLevel = "INDEPENDENT" | "ASSISTED" | "BEDRIDDEN";
export type UpdateType =
  | "MEDICATION"
  | "CARE"
  | "OBSERVATION"
  | "STATUS_CHANGE"
  | "VITAL_SIGNS"
  | "INCIDENT";
export type PatientMood = "GOOD" | "MODERATE" | "BAD";
export type DocumentPriority = "RED" | "YELLOW" | "GREEN";

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    requestId: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
    requestId: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface MedicationEntry {
  name: string;
  dosage: string;
  route: string;
  givenAt: string;
}

export interface VitalSigns {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  weight?: number;
  bloodSugar?: number;
}

export interface PatientUpdateDto {
  updateType: UpdateType;
  content: string;
  medicationsGiven?: MedicationEntry[];
  vitalSigns?: VitalSigns;
  carePerformed?: string[];
  patientMood: PatientMood;
  nextActionRequired?: string;
  isUrgent: boolean;
}
