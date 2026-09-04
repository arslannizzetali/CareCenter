"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { adminApi } from "@/lib/api/admin.api";
import { SimpleTable } from "@/components/data/simple-table";

export default function AdminPatientsPage() {
  const query = useQuery({
    queryKey: ["admin", "patients"],
    queryFn: () => adminApi.patients({ limit: 50 })
  });

  const rows =
    query.data?.map((patient) => [
      `${patient.firstName} ${patient.lastName}`,
      patient.roomNumber ?? "-",
      patient.careType,
      patient.status,
      `🔴${patient.documentCounts?.red ?? 0} 🟡${patient.documentCounts?.yellow ?? 0} 🟢${patient.documentCounts?.green ?? 0}`,
      <Link key={patient.id} href={`/patients/${patient.id}`} className="font-semibold text-primary">
        Görüntüle
      </Link>
    ]) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-xl font-bold text-text">Admin Hasta Paneli</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Yeni Hasta
          </Link>
          <button
            onClick={() => exportCsv(query.data ?? [])}
            className="rounded-xl border border-border bg-white px-4 py-2 font-semibold text-primary"
          >
            CSV İndir
          </button>
        </div>
      </div>
      <SimpleTable headers={["Ad Soyad", "Oda", "Tür", "Durum", "Evrak", "İşlem"]} rows={rows} />
    </div>
  );
}

function exportCsv(patients: NonNullable<ReturnType<typeof adminApi.patients> extends Promise<infer T> ? T : never>) {
  const rows = [
    ["Ad", "Soyad", "Oda", "Tür", "Durum"],
    ...patients.map((patient) => [patient.firstName, patient.lastName, patient.roomNumber ?? "", patient.careType, patient.status])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hastalar.csv";
  link.click();
  URL.revokeObjectURL(url);
}
