"use client";

import { api, buildQuery } from "./client";
import type { DocumentItem, PaginatedResponse, Patient, PatientUpdate } from "@/types";

export const patientApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<PaginatedResponse<Patient>["data"]>(`/patients${buildQuery(params)}`),
  get: (id: string) => api.get<Patient>(`/patients/${id}`),
  create: (body: unknown) => api.post<Patient>("/patients", body),
  update: (id: string, body: unknown) => api.patch<Patient>(`/patients/${id}`, body),
  delete: (id: string) => api.delete<void>(`/patients/${id}`),
  createUpdate: (id: string, body: unknown) => api.post<PatientUpdate>(`/patients/${id}/updates`, body),
  updates: (id: string, params?: Record<string, string | number | boolean | undefined>) =>
    api.get<PatientUpdate[]>(`/patients/${id}/updates${buildQuery(params)}`),
  documents: (id: string) =>
    api.get<{ red: DocumentItem[]; yellow: DocumentItem[]; green: DocumentItem[] }>(`/patients/${id}/documents`),
  uploadDocument: (id: string, formData: FormData) => api.post<DocumentItem>(`/patients/${id}/documents`, formData),
  changeDocumentPriority: (id: string, priority: "RED" | "YELLOW" | "GREEN") =>
    api.patch<DocumentItem>(`/documents/${id}/priority`, { priority }),
  deleteDocument: (id: string) => api.delete<void>(`/documents/${id}`)
};
