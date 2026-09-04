"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { authApi } from "@/lib/api/auth.api";
import { useAuthStore } from "@/lib/store/auth.store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrap />
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

function SessionBootstrap() {
  const setUser = useAuthStore((state) => state.setUser);
  const markSessionReady = useAuthStore((state) => state.markSessionReady);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      try {
        const user = await authApi.me();
        if (!cancelled) {
          setUser(user);
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      } finally {
        if (!cancelled) {
          markSessionReady();
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [logout, markSessionReady, setUser]);

  return null;
}
