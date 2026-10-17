"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ClipboardCheck,
  Eye,
  HeartPulse,
  Pencil,
  Pill,
  RefreshCcw,
  Siren,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import type { PatientUpdate } from "@/types";
import { cn } from "@/lib/utils";
import { fromNow } from "@/lib/locale";
import { patientApi } from "@/lib/api/patient.api";
import { ApiClientError } from "@/lib/api/client";
import type { UpdateType } from "@bakimevi/shared-types";

const updateMeta: Record<UpdateType, { label: string; icon: typeof Pill }> = {
  MEDICATION: { label: "Medication Given", icon: Pill },
  CARE: { label: "Care Performed", icon: ClipboardCheck },
  OBSERVATION: { label: "Observation", icon: Eye },
  STATUS_CHANGE: { label: "Status Changed", icon: RefreshCcw },
  VITAL_SIGNS: { label: "Vital Signs", icon: HeartPulse },
  INCIDENT: { label: "Incident/Accident", icon: AlertTriangle }
};

export function UpdateCard({
  update,
  patientId,
  canManage = false
}: {
  update: PatientUpdate;
  patientId?: string;
  canManage?: boolean;
}) {
  const meta = updateMeta[update.updateType];
  const Icon = meta.icon;
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => patientApi.deleteUpdate(patientId as string, update.id),
    onSuccess: () => {
      toast.success("Update deleted");
      void queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
      void queryClient.invalidateQueries({ queryKey: ["updates"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not delete update")
  });

  const showManage = canManage && Boolean(patientId);

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
        <div className="flex items-center gap-2">
          {update.isUrgent ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
              <Siren className="h-3.5 w-3.5" />
              URGENT
            </span>
          ) : null}
          {showManage ? (
            <>
              <Link
                href={`/patients/${patientId}/update/${update.id}`}
                className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this update?")) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-danger disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>
      <p className="text-sm leading-6 text-text">{update.content}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-surface px-3 py-1 text-muted">Mood: {moodLabel(update.patientMood)}</span>
        {update.patient ? (
          <span className="rounded-full bg-surface px-3 py-1 text-muted">
            Resident: {update.patient.firstName} {update.patient.lastName}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function moodLabel(mood: PatientUpdate["patientMood"]): string {
  if (mood === "GOOD") {
    return "Good";
  }
  if (mood === "MODERATE") {
    return "Moderate";
  }
  return "Bad";
}
