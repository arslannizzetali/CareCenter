"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, FileText, Users, UserRound } from "lucide-react";
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
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Aktif Hasta" value={stats?.activePatients ?? "-"} helper="Güncel hasta sayısı" icon={UserRound} />
          <StatCard
            label="Toplam Evrak"
            value={(stats?.totalDocuments.red ?? 0) + (stats?.totalDocuments.yellow ?? 0) + (stats?.totalDocuments.green ?? 0)}
            helper={`🔴${stats?.totalDocuments.red ?? 0} 🟡${stats?.totalDocuments.yellow ?? 0} 🟢${stats?.totalDocuments.green ?? 0}`}
            icon={FileText}
          />
          <StatCard label="Bugün Güncelleme" value={stats?.todayUpdates ?? "-"} helper="Tüm çalışanlar" icon={Activity} />
          <StatCard label="Aktif Çalışan" value={stats?.activeEmployees ?? "-"} helper="Bakım personeli" icon={Users} />
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          <StatCard label="Bugün Güncellediğim" value="-" helper="Kendi kayıtlarım" icon={Activity} />
          <StatCard label="Bu Hafta Yüklediğim Evrak" value="-" helper="Kendi yüklemelerim" icon={FileText} />
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-text">{isAdmin ? "Son Güncellemeler" : "Kendi Son Güncellemelerim"}</h2>
          <div className="space-y-3">
            {updatesQuery.data?.map((update) => <UpdateCard key={update.id} update={update} />)}
            {!updatesQuery.data?.length ? <p className="rounded-xl bg-surface p-4 text-sm text-muted">Kayıt bulunamadı.</p> : null}
          </div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-bold">Acil Güncellemeler</h2>
          </div>
          <div className="space-y-3">
            {updatesQuery.data?.filter((update) => update.isUrgent).map((update) => <UpdateCard key={update.id} update={update} />)}
            {!updatesQuery.data?.some((update) => update.isUrgent) ? (
              <p className="rounded-xl bg-white p-4 text-sm text-muted">Acil güncelleme yok.</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
