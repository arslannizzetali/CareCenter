"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Search } from "lucide-react";
import { documentApi, documentTypeApi } from "@/lib/api/document.api";
import { careTypeLabel, disabilityTypeLabel, patientStatusLabel } from "@/lib/labels";
import { expiryDotClass } from "@/lib/expiry";
import { formatDate } from "@/lib/locale";

const ageOptions = [
  ["", "All ages"],
  ["UNDER_65", "Under 65"],
  ["OVER_65", "65 and over"]
] as const;

const disabilityOptions = [
  ["", "All disability types"],
  ["PHYSICAL", "Physical"],
  ["MENTAL", "Mental"],
  ["BOTH", "Both"]
] as const;

const statusOptions = [
  ["", "All statuses"],
  ["ACTIVE", "Active"],
  ["DISCHARGED", "Discharged"],
  ["TRANSFERRED", "Transferred"]
] as const;

export default function DocumentMatrixPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [ageGroup, setAgeGroup] = useState("");
  const [disabilityType, setDisabilityType] = useState("");
  const [missingTypeId, setMissingTypeId] = useState("");
  const deferredSearch = useDeferredValue(search);

  const typesQuery = useQuery({ queryKey: ["document-types"], queryFn: () => documentTypeApi.list() });

  const matrixQuery = useQuery({
    queryKey: ["document-matrix", deferredSearch, status, ageGroup, disabilityType, missingTypeId],
    queryFn: () =>
      documentApi.matrix({
        search: deferredSearch || undefined,
        status: status || undefined,
        ageGroup: ageGroup || undefined,
        disabilityType: disabilityType || undefined,
        missingTypeId: missingTypeId || undefined,
        limit: 200
      })
  });

  const types = matrixQuery.data?.types ?? [];
  const rows = matrixQuery.data?.rows ?? [];

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (deferredSearch) parts.push(`arama: "${deferredSearch}"`);
    parts.push(`status: ${statusOptions.find(([v]) => v === status)?.[1] ?? "All"}`);
    if (ageGroup) parts.push(ageOptions.find(([v]) => v === ageGroup)?.[1] ?? "");
    if (disabilityType) parts.push(disabilityOptions.find(([v]) => v === disabilityType)?.[1] ?? "");
    if (missingTypeId) {
      const name = typesQuery.data?.find((type) => type.id === missingTypeId)?.name;
      if (name) parts.push(`without "${name}" document`);
    }
    return parts.filter(Boolean).join(" · ");
  }, [deferredSearch, status, ageGroup, disabilityType, missingTypeId, typesQuery.data]);

  return (
    <div className="print-area space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-xl font-bold text-text">Document Tracking Matrix</h2>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-white"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      <div className="no-print space-y-3 rounded-2xl border border-border bg-white p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by first name, last name, room or national ID (11 digits)..."
            className="focus-ring w-full rounded-xl border border-border py-3 pl-12 pr-4"
          />
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Select label="Status" value={status} setValue={setStatus} options={statusOptions} />
          <Select label="Age group" value={ageGroup} setValue={setAgeGroup} options={ageOptions} />
          <Select label="Disability type" value={disabilityType} setValue={setDisabilityType} options={disabilityOptions} />
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-muted">Missing document</span>
            <select
              value={missingTypeId}
              onChange={(event) => setMissingTypeId(event.target.value)}
              className="focus-ring rounded-xl border border-border bg-white px-3 py-2"
            >
              <option value="">No filter</option>
              {typesQuery.data?.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} olmayanlar
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="hidden print:block">
        <h1 className="text-lg font-bold">Document Tracking Matrix</h1>
        <p className="text-xs text-gray-600">
          {filterSummary} — {formatDate(new Date())} — {rows.length} records
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="sticky left-0 z-10 bg-surface px-4 py-3 font-bold">Patient</th>
              <th className="px-3 py-3 font-bold">Room</th>
              {types.map((type) => (
                <th key={type.id} className="px-3 py-3 font-bold">
                  {type.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.patient.id} className="hover:bg-surface">
                <td className="sticky left-0 z-10 bg-white px-4 py-2 font-semibold text-text">
                  <Link href={`/patients/${row.patient.id}`} className="text-primary">
                    {row.patient.firstName} {row.patient.lastName}
                  </Link>
                  <span className="block text-xs font-normal text-muted">
                    {careTypeLabel(row.patient.careType)}
                    {row.patient.disabilityType ? ` · ${disabilityTypeLabel(row.patient.disabilityType)}` : ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted">{row.patient.roomNumber ?? "-"}</td>
                {types.map((type) => {
                  const cell = row.cells[type.id];
                  if (!cell) {
                    return (
                      <td key={type.id} className="px-3 py-2">
                        <Link
                          href={`/patients/${row.patient.id}/documents?type=${type.id}&return=matrix`}
                          className="no-print inline-block rounded-lg border border-dashed border-border px-2 py-1 text-xs text-muted hover:border-primary hover:text-primary"
                        >
                          + Upload
                        </Link>
                        <span className="hidden text-xs text-red-700 print:inline">YOK</span>
                      </td>
                    );
                  }
                  return (
                    <td key={type.id} className="px-3 py-2">
                      <Link
                        href={`/patients/${row.patient.id}/documents?type=${type.id}&return=matrix`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text"
                        title={cell.fileName}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${expiryDotClass(cell.expiryStatus)}`} />
                        {cell.remainingLabel}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="p-6 text-center text-muted">
            {matrixQuery.isLoading ? "Loading..." : "No records found."}
          </p>
        ) : null}
      </div>

      <p className="no-print text-xs text-muted">
        🔴 less than 1 month &nbsp; 🟡 less than 3 months &nbsp; 🟢 longer &nbsp; ⚪ no expiry
      </p>
    </div>
  );
}

function Select({
  label,
  value,
  setValue,
  options
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-semibold text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="focus-ring rounded-xl border border-border bg-white px-3 py-2"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
