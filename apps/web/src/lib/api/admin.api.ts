"use client";

import { api, buildQuery } from "./client";
import type { AuditLogEntry, Patient, PatientUpdate, User } from "@/types";

export interface DashboardStats {
  activePatients: number;
  totalDocuments: { red: number; yellow: number; green: number };
  todayUpdates: number;
  activeEmployees: number;
  urgentUpdates: number;
  ageBreakdown: { over65: number; under65: number };
  disabilityBreakdown: { physical: number; mental: number };
  unreadNotifications: number;
}

export const adminApi = {
  stats: () => api.get<DashboardStats>("/admin/dashboard-stats"),
  recentUpdates: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<PatientUpdate[]>(`/admin/recent-updates${buildQuery(params)}`),
  users: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<User[]>(`/users${buildQuery(params)}`),
  deletedUsers: () => api.get<User[]>("/users?deleted=true"),
  getUser: (id: string) => api.get<User>(`/users/${id}`),
  createUser: (body: unknown) => api.post<User>("/users", body),
  updateUser: (id: string, body: unknown) => api.patch<User>(`/users/${id}`, body),
  deleteUser: (id: string) => api.delete<void>(`/users/${id}`),
  restoreUser: (id: string) => api.post<User>(`/users/${id}/restore`),
  patients: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<Patient[]>(`/admin/patients${buildQuery(params)}`),
  deletedPatients: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<Patient[]>(`/admin/patients/deleted${buildQuery(params)}`),
  deletePatient: (id: string) => api.delete<void>(`/patients/${id}`),
  restorePatient: (id: string) => api.post<Patient>(`/admin/patients/${id}/restore`),
  purgePatient: (id: string) => api.delete<void>(`/admin/patients/${id}/permanent`),
  auditLogs: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<AuditLogEntry[]>(`/admin/audit-logs${buildQuery(params)}`),
  retentionPolicies: () => api.get<unknown[]>("/admin/retention-policies"),
  updateRetentionPolicies: (body: unknown) => api.patch<unknown>("/admin/retention-policies", body)
};
