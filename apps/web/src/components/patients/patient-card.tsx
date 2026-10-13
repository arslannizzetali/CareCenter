import Link from "next/link";
import { ChevronRight, UserRound } from "lucide-react";
import type { Patient } from "@/types";
import { fromNow } from "@/lib/locale";
import { cn } from "@/lib/utils";

export function PatientCard({ patient }: { patient: Patient }) {
  const latest = patient.patientUpdates?.[0]?.createdAt;

  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-primary">
            <UserRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">
              {patient.firstName} {patient.lastName}
            </h2>
            <p className="text-sm text-muted">
              {age(patient.birthDate)} yrs | {careTypeLabel(patient.careType)}
            </p>
          </div>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(patient.status))}>
          {statusLabel(patient.status)}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-surface p-3">
          <p className="text-xs text-muted">Room</p>
          <p className="font-semibold text-text">{patient.roomNumber ?? "-"}</p>
        </div>
        <div className="rounded-xl bg-surface p-3">
          <p className="text-xs text-muted">Last update</p>
          <p className="font-semibold text-text">{latest ? fromNow(latest) : "None"}</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2 text-xs font-semibold">
        <span className="rounded-full bg-red-50 px-3 py-1 text-red-800">🔴 {patient.documentCounts?.red ?? 0} docs</span>
        <span className="rounded-full bg-yellow-50 px-3 py-1 text-yellow-800">🟡 {patient.documentCounts?.yellow ?? 0} docs</span>
        <span className="rounded-full bg-green-50 px-3 py-1 text-green-800">🟢 {patient.documentCounts?.green ?? 0} docs</span>
      </div>

      <Link href={`/patients/${patient.id}`} className="inline-flex items-center gap-2 font-semibold text-primary">
        Details <ChevronRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function age(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let value = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    value -= 1;
  }
  return value;
}

function careTypeLabel(value: Patient["careType"]): string {
  if (value === "ELDERLY") {
    return "Elderly";
  }
  if (value === "DISABLED") {
    return "Physically Disabled";
  }
  return "Both";
}

function statusLabel(value: Patient["status"]): string {
  if (value === "ACTIVE") {
    return "Active";
  }
  if (value === "DISCHARGED") {
    return "Discharged";
  }
  return "Transferred";
}

function statusClass(value: Patient["status"]): string {
  if (value === "ACTIVE") {
    return "bg-green-100 text-green-800";
  }
  if (value === "DISCHARGED") {
    return "bg-gray-100 text-gray-800";
  }
  return "bg-blue-100 text-blue-800";
}
