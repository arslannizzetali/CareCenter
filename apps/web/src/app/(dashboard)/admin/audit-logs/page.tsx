"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin.api";
import { SimpleTable } from "@/components/data/simple-table";

export default function AuditLogsPage() {
  const query = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: () => adminApi.auditLogs({ limit: 50 })
  });

  const rows =
    query.data?.map((log) => {
      const item = log as { action?: string; resourceType?: string; resourceId?: string; ipAddress?: string; performedAt?: string };
      return [item.performedAt ?? "-", item.action ?? "-", item.resourceType ?? "-", item.resourceId ?? "-", item.ipAddress ?? "-"];
    }) ?? [];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-xl font-bold text-text">Aktivite Kayıtları</h2>
      </div>
      <SimpleTable headers={["Tarih", "Aksiyon", "Kaynak", "Kaynak ID", "IP"]} rows={rows} />
    </div>
  );
}
