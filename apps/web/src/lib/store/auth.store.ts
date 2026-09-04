"use client";

import { create } from "zustand";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isSessionReady: boolean;
  setSession: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  setAccessToken: (accessToken: string) => void;
  markSessionReady: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isSessionReady: false,
  setSession: (user, accessToken) => set({ user, accessToken, isAuthenticated: true, isSessionReady: true }),
  setUser: (user) => set({ user, isAuthenticated: true, isSessionReady: true }),
  setAccessToken: (accessToken) => set({ accessToken, isAuthenticated: Boolean(get().user) }),
  markSessionReady: () => set({ isSessionReady: true }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false, isSessionReady: true })
}));
