"use client";

import { Bell, Menu } from "lucide-react";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Hastalar",
  "/admin/users": "Çalışanlar",
  "/admin/recent-updates": "Son Güncellemeler",
  "/admin/audit-logs": "Audit Log",
  "/admin/settings": "Ayarlar"
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? (pathname.includes("/patients/") ? "Hasta Detayı" : "BakımEvi");

  return (
    <header className="sticky top-0 z-10 flex h-20 items-center justify-between gap-3 border-b border-border bg-white/95 px-5 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-2xl border border-border bg-white p-3 shadow-sm transition hover:bg-surface lg:hidden"
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5 text-muted" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          <p className="hidden text-sm text-muted sm:block">Hasta bakım süreçlerini güvenli şekilde yönetin</p>
        </div>
      </div>
      <button className="relative rounded-2xl border border-border bg-white p-3 shadow-sm transition hover:bg-surface">
        <Bell className="h-5 w-5 text-muted" />
        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-danger" />
      </button>
    </header>
  );
}
