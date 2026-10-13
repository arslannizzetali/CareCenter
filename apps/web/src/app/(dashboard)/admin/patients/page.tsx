"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api/admin.api";
import { ApiClientError } from "@/lib/api/client";
import { careTypeLabel, disabilityTypeLabel, patientStatusLabel } from "@/lib/labels";
import { formatDate } from "@/lib/locale";
import { SimpleTable } from "@/components/data/simple-table";

export default function AdminPatientsPage() {
  const queryClient = useQueryClient();
  const [archiveView, setArchiveView] = useState(false);
  const [search, setSearch] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [disabilityType, setDisabilityType] = useState("");
  const deferredSearch = useDeferredValue(search);

  const query = useQuery({
    queryKey: ["admin", "patients", archiveView ? "archive" : "active", deferredSearch, ageGroup, disabilityType],
    queryFn: () =>
      archiveView
        ? adminApi.deletedPatients({ limit: 50, search: deferredSearch || undefined })
        : adminApi.patients({
            limit: 50,
            search: deferredSearch || undefined,
            ageGroup: ageGroup || undefined,
            disabilityType: disabilityType || undefined
          })
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "patients"] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deletePatient(id),
    onSuccess: () => {
      toast.success("Patient moved to archive");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not delete patient")
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => adminApi.restorePatient(id),
    onSuccess: () => {
      toast.success("Patient restored");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not restore patient")
  });

  const purgeMutation = useMutation({
    mutationFn: (id: string) => adminApi.purgePatient(id),
    onSuccess: () => {
      toast.success("Patient record permanently deleted");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Permanent deletion failed")
  });

  const busy = deleteMutation.isPending || restoreMutation.isPending || purgeMutation.isPending;

  function handleDelete(id: string, name: string): void {
    if (window.confirm(`Are you sure you want to move ${name}'s record to the archive?`)) {
      deleteMutation.mutate(id);
    }
  }

  function handlePurge(id: string, name: string): void {
    if (
      window.confirm(
        `${name}'s record and all its updates/documents will be PERMANENTLY deleted. This cannot be undone. Continue?`
      )
    ) {
      purgeMutation.mutate(id);
    }
  }

  const headers = archiveView
    ? ["Name", "Room", "Type", "Deletion Date", "Action"]
    : ["Name", "Room", "Type", "Disability Type", "Status", "Documents", "Action"];

  const rows =
    query.data?.map((patient) => {
      const name = `${patient.firstName} ${patient.lastName}`;

      if (archiveView) {
        return [
          name,
          patient.roomNumber ?? "-",
          careTypeLabel(patient.careType),
          patient.deletedAt ? formatDate(patient.deletedAt) : "-",
          <div key={patient.id} className="flex items-center gap-3">
            <button
              onClick={() => restoreMutation.mutate(patient.id)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-semibold text-primary hover:bg-blue-50 disabled:opacity-60"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore
            </button>
            <button
              onClick={() => handlePurge(patient.id, name)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-semibold text-danger hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Permanently Delete
            </button>
          </div>
        ];
      }

      const canDelete = patient.status === "DISCHARGED";
      return [
        name,
        patient.roomNumber ?? "-",
        careTypeLabel(patient.careType),
        disabilityTypeLabel(patient.disabilityType),
        patientStatusLabel(patient.status),
        `🔴${patient.documentCounts?.red ?? 0} 🟡${patient.documentCounts?.yellow ?? 0} 🟢${patient.documentCounts?.green ?? 0}`,
        <div key={patient.id} className="flex items-center gap-3">
          <Link href={`/patients/${patient.id}`} className="font-semibold text-primary">
            View
          </Link>
          <button
            onClick={() => handleDelete(patient.id, name)}
            disabled={busy || !canDelete}
            title={canDelete ? "Move to archive" : "To delete, first set the status to 'Discharged'"}
            className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-semibold text-danger hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      ];
    }) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-xl font-bold text-text">
          {archiveView ? "Discharged / Archive" : "Admin Patient Panel"}
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => setArchiveView((value) => !value)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
              archiveView ? "border-primary bg-blue-50 text-primary" : "border-border bg-white text-muted"
            }`}
          >
            {archiveView ? "Active list" : "Discharged Archive"}
          </button>
          {!archiveView ? (
            <>
              <Link
                href="/patients/new"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                New Patient
              </Link>
              <button
                onClick={() => exportCsv(query.data ?? [])}
                className="rounded-xl border border-border bg-white px-4 py-2 font-semibold text-primary"
              >
                Download CSV
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by first name, last name, room or national ID (11 digits)..."
          className="focus-ring w-full rounded-2xl border border-border bg-white py-3 pl-12 pr-4"
        />
      </div>

      {!archiveView ? (
        <div className="flex flex-wrap gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-muted">Age group</span>
            <select
              value={ageGroup}
              onChange={(event) => setAgeGroup(event.target.value)}
              className="focus-ring rounded-xl border border-border bg-white px-3 py-2"
            >
              <option value="">All ages</option>
              <option value="UNDER_65">Under 65</option>
              <option value="OVER_65">65 and over</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-muted">Disability type</span>
            <select
              value={disabilityType}
              onChange={(event) => setDisabilityType(event.target.value)}
              className="focus-ring rounded-xl border border-border bg-white px-3 py-2"
            >
              <option value="">All</option>
              <option value="PHYSICAL">Physical</option>
              <option value="MENTAL">Mental</option>
              <option value="BOTH">Both</option>
            </select>
          </label>
        </div>
      ) : null}

      <SimpleTable headers={headers} rows={rows} />
      {!rows.length ? (
        <p className="rounded-2xl bg-surface p-6 text-center text-muted">
          {archiveView ? "No records in the archive." : "No patients found."}
        </p>
      ) : null}
    </div>
  );
}

function exportCsv(patients: NonNullable<ReturnType<typeof adminApi.patients> extends Promise<infer T> ? T : never>) {
  const rows = [
    ["First Name", "Last Name", "Room", "Type", "Status"],
    ...patients.map((patient) => [
      patient.firstName,
      patient.lastName,
      patient.roomNumber ?? "",
      careTypeLabel(patient.careType),
      patientStatusLabel(patient.status)
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "patients.csv";
  link.click();
  URL.revokeObjectURL(url);
}
