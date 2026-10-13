"use client";

import { api } from "./client";

export type HandoverHours = 12 | 24 | 48;

export interface HandoverSummary {
  summary: string;
  hours: HandoverHours;
  updateCount: number;
  truncated: boolean;
  generatedAt: string;
}

export const aiApi = {
  handoverSummary: (patientId: string, hours: HandoverHours) =>
    api.post<HandoverSummary>(`/patients/${patientId}/ai/handover-summary`, { hours })
};
