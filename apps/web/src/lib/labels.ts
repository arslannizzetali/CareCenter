import type { CareType, DisabilityType, MobilityLevel, PatientStatus } from "@bakimevi/shared-types";

export const careTypeLabels: Record<CareType, string> = {
  ELDERLY: "Elderly",
  DISABLED: "Physically Disabled",
  BOTH: "Both"
};

export const patientStatusLabels: Record<PatientStatus, string> = {
  ACTIVE: "Active",
  DISCHARGED: "Discharged",
  TRANSFERRED: "Transferred"
};

export const mobilityLevelLabels: Record<MobilityLevel, string> = {
  INDEPENDENT: "Independent",
  ASSISTED: "Assisted",
  BEDRIDDEN: "Bedridden"
};

export const disabilityTypeLabels: Record<DisabilityType, string> = {
  PHYSICAL: "Physical",
  MENTAL: "Mental",
  BOTH: "Both"
};

export function disabilityTypeLabel(value?: string | null): string {
  if (!value) {
    return "-";
  }
  return disabilityTypeLabels[value as DisabilityType] ?? value;
}

export function careTypeLabel(value: string): string {
  return careTypeLabels[value as CareType] ?? value;
}

export function patientStatusLabel(value: string): string {
  return patientStatusLabels[value as PatientStatus] ?? value;
}
