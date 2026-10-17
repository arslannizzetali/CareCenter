"use client";

import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "@/lib/api/notification.api";
import { useAuthStore } from "@/lib/store/auth.store";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Residents",
  "/documents": "Document Tracking",
  "/admin/users": "Employees",
  "/admin/recent-updates": "Recent Updates",
  "/admin/audit-logs": "Activity Log",
  "/admin/notifications": "Notifications",
  "/admin/settings": "Settings"
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN");
  const title = pageTitles[pathname] ?? (pathname.includes("/patients/") ? "Resident Details" : "CareCenter");

  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationApi.unreadCount,
    enabled: isAdmin,
    refetchInterval: 60_000
  });
  const unread = unreadQuery.data?.unreadCount ?? 0;

  return (
    <header className="no-print sticky top-0 z-10 flex h-20 items-center justify-between gap-3 border-b border-border bg-white/95 px-5 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-2xl border border-border bg-white p-3 shadow-sm transition hover:bg-surface lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-muted" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          <p className="hidden text-sm text-muted sm:block">Manage resident care securely</p>
        </div>
      </div>
      {isAdmin ? (
        <Link
          href="/admin/notifications"
          className="relative rounded-2xl border border-border bg-white p-3 shadow-sm transition hover:bg-surface"
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        >
          <Bell className="h-5 w-5 text-muted" />
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Link>
      ) : (
        <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
          <Bell className="h-5 w-5 text-muted" />
        </div>
      )}
    </header>
  );
}
