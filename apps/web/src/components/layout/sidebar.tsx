"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ClipboardList, FileClock, LogOut, Settings, ShieldCheck, Users, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/use-auth";

const employeeNav = [{ href: "/patients", label: "Hastalar", icon: UserRound }];

const adminNav = [
  { href: "/patients", label: "Hastalar", icon: UserRound },
  { href: "/admin/users", label: "Çalışanlar", icon: Users },
  { href: "/admin/recent-updates", label: "Son Güncellemeler", icon: Activity },
  { href: "/admin/audit-logs", label: "Audit Log", icon: FileClock },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings }
];

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const nav = user?.role === "ADMIN" ? adminNav : employeeNav;

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onMobileClose} aria-hidden="true" />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-white transition-transform duration-200 lg:z-20 lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:flex"
        )}
      >
        <div className="flex h-20 items-center justify-between gap-3 border-b border-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-text">BakımEvi</p>
              <p className="text-xs text-muted">Şirket içi yönetim</p>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            className="rounded-xl p-2 text-muted hover:bg-surface lg:hidden"
            aria-label="Menüyü kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          <Link
            href="/dashboard"
            onClick={onMobileClose}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted transition hover:bg-surface hover:text-text",
              pathname === "/dashboard" && "bg-blue-50 text-primary"
            )}
          >
            <ClipboardList className="h-5 w-5" />
            Dashboard
          </Link>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted transition hover:bg-surface hover:text-text",
                pathname.startsWith(item.href) && "bg-blue-50 text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 rounded-xl bg-surface p-3">
            <p className="font-semibold text-text">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted">{user?.role === "ADMIN" ? "Yönetici" : "Bakım personeli"}</p>
          </div>
          <button
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-danger hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            Çıkış Yap
          </button>
        </div>
      </aside>
    </>
  );
}
