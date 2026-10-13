"use client";

import { api, buildQuery } from "./client";
import type { DocumentItem, DocumentMatrix, DocumentType, PatientDocTypeStatus } from "@/types";

export const documentApi = {
  matrix: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<DocumentMatrix>(`/documents/matrix${buildQuery(params)}`),
  patientStatus: (patientId: string) =>
    api.get<PatientDocTypeStatus[]>(`/patients/${patientId}/documents/status`),
  updateMeta: (id: string, body: { documentTypeId?: string | null; expiresAt?: string | null }) =>
    api.patch<DocumentItem>(`/documents/${id}/meta`, body)
};

export const documentTypeApi = {
  list: (includeInactive = false) =>
    api.get<DocumentType[]>(`/document-types${includeInactive ? "?includeInactive=true" : ""}`),
  create: (body: { name: string; sortOrder?: number }) => api.post<DocumentType>("/document-types", body),
  update: (id: string, body: { name: string; sortOrder?: number; isActive?: boolean }) =>
    api.patch<DocumentType>(`/document-types/${id}`, body),
  remove: (id: string) => api.delete<void>(`/document-types/${id}`)
};
