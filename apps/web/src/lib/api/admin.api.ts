"use client";

import { api, buildQuery } from "./client";
import type { Patient, PatientUpdate, User } from "@/types";

export interface DashboardStats {
  activePatients: number;
  totalDocuments: { red: number; yellow: number; green: number };
  todayUpdates: number;
  activeEmployees: number;
  urgentUpdates: number;
}

export const adminApi = {
  stats: () => api.get<DashboardStats>("/admin/dashboard-stats"),
  recentUpdates: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<PatientUpdate[]>(`/admin/recent-updates${buildQuery(params)}`),
  users: () => api.get<User[]>("/users"),
  createUser: (body: unknown) => api.post<User>("/users", body),
  patients: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<Patient[]>(`/admin/patients${buildQuery(params)}`),
  auditLogs: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<unknown[]>(`/admin/audit-logs${buildQuery(params)}`),
  retentionPolicies: () => api.get<unknown[]>("/admin/retention-policies"),
  updateRetentionPolicies: (body: unknown) => api.patch<unknown>("/admin/retention-policies", body)
};
