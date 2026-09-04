"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuthStore } from "@/lib/store/auth.store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isSessionReady, user } = useAuthStore();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (pathname.startsWith("/admin") && user?.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isSessionReady, pathname, router, user?.role]);

  if (!isSessionReady || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar isMobileOpen={isMobileNavOpen} onMobileClose={() => setIsMobileNavOpen(false)} />
      <div className="lg:pl-72">
        <Header onMenuClick={() => setIsMobileNavOpen(true)} />
        <main className="px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
