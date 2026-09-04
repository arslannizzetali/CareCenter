"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth.store";
import { authApi } from "@/lib/api/auth.api";

export function useAuth() {
  const router = useRouter();
  const store = useAuthStore();

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } finally {
      store.logout();
      router.push("/login");
    }
  }

  function canAdmin(): boolean {
    return store.user?.role === "ADMIN";
  }

  return { ...store, logout, canAdmin };
}
