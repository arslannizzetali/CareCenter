"use client";

import { api } from "./client";
import type { User } from "@/types";

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export const authApi = {
  login: (email: string, password: string) => api.post<LoginResponse>("/auth/login", { email, password }),
  me: () => api.get<User>("/auth/me"),
  refresh: () => api.post<{ accessToken: string }>("/auth/refresh"),
  logout: () => api.post<void>("/auth/logout")
};
