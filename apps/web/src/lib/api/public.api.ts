"use client";

import { api } from "./client";

export interface DemoRequestBody {
  institutionName: string;
  contactName: string;
  phone: string;
  email: string;
  message?: string;
}

export const publicApi = {
  submitDemoRequest: (body: DemoRequestBody) => api.post<void>("/public/demo-requests", body)
};
