import { AlertTriangle, ClipboardCheck, Eye, HeartPulse, Pill, RefreshCcw, Siren } from "lucide-react";
import type { PatientUpdate } from "@/types";
import { cn } from "@/lib/utils";
import { fromNow } from "@/lib/locale";
import type { UpdateType } from "@bakimevi/shared-types";

const updateMeta: Record<UpdateType, { label: string; icon: typeof Pill }> = {
  MEDICATION: { label: "İlaç Verildi", icon: Pill },
  CARE: { label: "Bakım Yapıldı", icon: ClipboardCheck },
  OBSERVATION: { label: "Gözlem", icon: Eye },
  STATUS_CHANGE: { label: "Durum Değişti", icon: RefreshCcw },
  VITAL_SIGNS: { label: "Vital Bulgular", icon: HeartPulse },
  INCIDENT: { label: "Olay/Kaza", icon: AlertTriangle }
};

export function UpdateCard({ update }: { update: PatientUpdate }) {
  const meta = updateMeta[update.updateType];
  const Icon = meta.icon;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-sm",
        update.isUrgent ? "border-red-300 bg-red-50/40" : "border-border"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-text">{meta.label}</p>
            <p className="text-xs text-muted">
              {update.employee.firstName} {update.employee.lastName} - {fromNow(update.createdAt)}
            </p>
          </div>
        </div>
        {update.isUrgent ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
            <Siren className="h-3.5 w-3.5" />
            ACİL
          </span>
        ) : null}
      </div>
      <p className="text-sm leading-6 text-text">{update.content}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-surface px-3 py-1 text-muted">Ruh hali: {moodLabel(update.patientMood)}</span>
        {update.patient ? (
          <span className="rounded-full bg-surface px-3 py-1 text-muted">
            Hasta: {update.patient.firstName} {update.patient.lastName}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function moodLabel(mood: PatientUpdate["patientMood"]): string {
  if (mood === "GOOD") {
    return "İyi";
  }
  if (mood === "MODERATE") {
    return "Orta";
  }
  return "Kötü";
}
