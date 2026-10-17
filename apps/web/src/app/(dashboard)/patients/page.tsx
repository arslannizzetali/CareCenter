"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { patientApi } from "@/lib/api/patient.api";
import { PatientCard } from "@/components/patients/patient-card";

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [careType, setCareType] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [disabilityType, setDisabilityType] = useState("");
  const deferredSearch = useDeferredValue(search);

  const patientsQuery = useQuery({
    queryKey: ["patients", deferredSearch, status, careType, ageGroup, disabilityType],
    queryFn: () =>
      patientApi.list({
        search: deferredSearch,
        status: status || undefined,
        careType: careType || undefined,
        ageGroup: ageGroup || undefined,
        disabilityType: disabilityType || undefined,
        limit: 30
      })
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-text">Residents</h1>
        <Link
          href="/patients/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          New Resident
        </Link>
      </div>
      <section className="rounded-3xl border border-border bg-surface p-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by first name, last name, room or national ID (11 digits)..."
            className="focus-ring w-full rounded-2xl border border-border bg-white py-4 pl-12 pr-4 text-lg"
          />
        </div>
        <div className="mt-4 space-y-2">
          <Filter value={status} setValue={setStatus} options={[["", "All"], ["ACTIVE", "Active"], ["DISCHARGED", "Discharged"], ["TRANSFERRED", "Transferred"]]} />
          <Filter value={careType} setValue={setCareType} options={[["", "All"], ["ELDERLY", "Elderly"], ["DISABLED", "Physically Disabled"], ["BOTH", "Both"]]} />
          <Filter value={ageGroup} setValue={setAgeGroup} options={[["", "All ages"], ["UNDER_65", "Under 65"], ["OVER_65", "65 and over"]]} />
          <Filter value={disabilityType} setValue={setDisabilityType} options={[["", "All disability types"], ["PHYSICAL", "Physical"], ["MENTAL", "Mental"], ["BOTH", "Both"]]} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {patientsQuery.data?.map((patient) => <PatientCard key={patient.id} patient={patient} />)}
      </section>
      {!patientsQuery.data?.length ? <p className="rounded-2xl bg-surface p-6 text-center text-muted">No residents found.</p> : null}
    </div>
  );
}

function Filter({
  value,
  setValue,
  options
}: {
  value: string;
  setValue: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue || label}
          onClick={() => setValue(optionValue)}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            value === optionValue ? "border-primary bg-blue-50 text-primary" : "border-border bg-white text-muted"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
