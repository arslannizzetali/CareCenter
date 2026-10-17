"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin.api";
import { formatDateTime } from "@/lib/locale";
import { SimpleTable } from "@/components/data/simple-table";

export default function AdminRecentUpdatesPage() {
  const [urgentOnly, setUrgentOnly] = useState(false);
  const query = useQuery({
    queryKey: ["admin", "recent-updates", urgentOnly],
    queryFn: () => adminApi.recentUpdates({ limit: 25, isUrgent: urgentOnly || undefined })
  });

  const rows =
    query.data?.map((update) => [
      formatDateTime(update.createdAt),
      `${update.employee.firstName} ${update.employee.lastName}`,
      update.patient ? `${update.patient.firstName} ${update.patient.lastName}` : "-",
      update.patient?.roomNumber ?? "-",
      update.updateType,
      update.summary ?? update.content.slice(0, 80),
      update.isUrgent ? "URGENT" : "-"
    ]) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-xl font-bold text-text">All Employee Updates</h2>
        <label className="flex items-center gap-2 font-semibold text-danger">
          <input type="checkbox" checked={urgentOnly} onChange={(event) => setUrgentOnly(event.target.checked)} />
          Urgent only
        </label>
      </div>
      <SimpleTable headers={["Date/Time", "Employee", "Resident", "Room", "Type", "Summary", "Urgent?"]} rows={rows} />
    </div>
  );
}
