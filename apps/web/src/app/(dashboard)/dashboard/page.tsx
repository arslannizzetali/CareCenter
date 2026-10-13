"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Accessibility, Activity, AlertTriangle, Bell, Brain, FileText, Users, UserRound } from "lucide-react";
import { adminApi } from "@/lib/api/admin.api";
import { patientUpdateApi } from "@/lib/api/patient-update.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { StatCard } from "@/components/data/stat-card";
import { UpdateCard } from "@/components/patients/update-card";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN";

  const statsQuery = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminApi.stats,
    enabled: isAdmin
  });

  const updatesQuery = useQuery({
    queryKey: ["updates", "recent", isAdmin],
    queryFn: () => (isAdmin ? adminApi.recentUpdates({ limit: 10 }) : patientUpdateApi.recent({ limit: 5 })),
    enabled: Boolean(user)
  });

  const stats = statsQuery.data;

  return (
    <div className="space-y-8">
      {isAdmin ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active Patients" value={stats?.activePatients ?? "-"} helper="Current patient count" icon={UserRound} />
            <StatCard
              label="Total Documents"
              value={(stats?.totalDocuments.red ?? 0) + (stats?.totalDocuments.yellow ?? 0) + (stats?.totalDocuments.green ?? 0)}
              helper={`🔴${stats?.totalDocuments.red ?? 0} 🟡${stats?.totalDocuments.yellow ?? 0} 🟢${stats?.totalDocuments.green ?? 0}`}
              icon={FileText}
            />
            <StatCard label="Updates Today" value={stats?.todayUpdates ?? "-"} helper="All staff" icon={Activity} />
            <StatCard label="Active Staff" value={stats?.activeEmployees ?? "-"} helper="Care staff" icon={Users} />
          </section>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="65 and Over"
              value={stats?.ageBreakdown.over65 ?? "-"}
              helper={`Under 65: ${stats?.ageBreakdown.under65 ?? 0}`}
              icon={UserRound}
            />
            <StatCard
              label="Physical Disability"
              value={stats?.disabilityBreakdown.physical ?? "-"}
              helper="Active patients"
              icon={Accessibility}
            />
            <StatCard
              label="Mental Disability"
              value={stats?.disabilityBreakdown.mental ?? "-"}
              helper="Active patients"
              icon={Brain}
            />
            <Link href="/admin/notifications" className="block">
              <StatCard
                label="Unread Notifications"
                value={stats?.unreadNotifications ?? "-"}
                helper="Document expiry alerts"
                icon={Bell}
              />
            </Link>
          </section>
        </>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          <StatCard label="My Updates Today" value="-" helper="My own records" icon={Activity} />
          <StatCard label="Docs I Uploaded This Week" value="-" helper="My uploads" icon={FileText} />
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-text">{isAdmin ? "Recent Updates" : "My Recent Updates"}</h2>
          <div className="space-y-3">
            {updatesQuery.data?.map((update) => <UpdateCard key={update.id} update={update} />)}
            {!updatesQuery.data?.length ? <p className="rounded-xl bg-surface p-4 text-sm text-muted">No records found.</p> : null}
          </div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-bold">Urgent Updates</h2>
          </div>
          <div className="space-y-3">
            {updatesQuery.data?.filter((update) => update.isUrgent).map((update) => <UpdateCard key={update.id} update={update} />)}
            {!updatesQuery.data?.some((update) => update.isUrgent) ? (
              <p className="rounded-xl bg-white p-4 text-sm text-muted">No urgent updates.</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
