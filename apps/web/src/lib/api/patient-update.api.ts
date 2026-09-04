"use client";

import { api, buildQuery } from "./client";
import type { PatientUpdate } from "@/types";

export const patientUpdateApi = {
  recent: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<PatientUpdate[]>(`/patient-updates/recent${buildQuery(params)}`)
};
