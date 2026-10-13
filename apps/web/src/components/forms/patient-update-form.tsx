"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ClipboardCheck, Eye, HeartPulse, Pill, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { patientApi } from "@/lib/api/patient.api";
import { ApiClientError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { PatientUpdate } from "@/types";

const updateTypes = [
  { value: "MEDICATION", label: "Medication Given", icon: Pill },
  { value: "CARE", label: "Care Performed", icon: ClipboardCheck },
  { value: "OBSERVATION", label: "Observation", icon: Eye },
  { value: "STATUS_CHANGE", label: "Status Changed", icon: RefreshCcw },
  { value: "VITAL_SIGNS", label: "Vital Signs", icon: HeartPulse },
  { value: "INCIDENT", label: "Incident/Accident", icon: AlertTriangle }
] as const;

type UpdateTypeValue = (typeof updateTypes)[number]["value"];

const careOptions = ["Bathing assistance", "Feeding assistance", "Physical therapy", "Wound care", "Psychological support", "Exercise", "Medication reminder", "Change of clothes"];

function firstMedication(update?: PatientUpdate): { name: string; dosage: string; route: string } {
  const list = (update?.medicationsGiven as Array<{ name?: string; dosage?: string; route?: string }> | undefined) ?? [];
  const first = list[0];
  return { name: first?.name ?? "", dosage: first?.dosage ?? "", route: first?.route ?? "oral" };
}

function vitals(update?: PatientUpdate): { bloodPressure: string; heartRate: string; temperature: string } {
  const v = (update?.vitalSigns as { bloodPressure?: string; heartRate?: number; temperature?: number } | undefined) ?? {};
  return {
    bloodPressure: v.bloodPressure ?? "",
    heartRate: v.heartRate != null ? String(v.heartRate) : "",
    temperature: v.temperature != null ? String(v.temperature) : ""
  };
}

export function PatientUpdateForm({ patientId, update }: { patientId: string; update?: PatientUpdate }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(update);
  const seededMedication = firstMedication(update);
  const seededVitals = vitals(update);

  const [updateType, setUpdateType] = useState<UpdateTypeValue>((update?.updateType as UpdateTypeValue) ?? "OBSERVATION");
  const [content, setContent] = useState(update?.content ?? "");
  const [patientMood, setPatientMood] = useState<"GOOD" | "MODERATE" | "BAD">(update?.patientMood ?? "GOOD");
  const [isUrgent, setIsUrgent] = useState(update?.isUrgent ?? false);
  const [carePerformed, setCarePerformed] = useState<string[]>(update?.carePerformed ?? []);
  const [medicationName, setMedicationName] = useState(seededMedication.name);
  const [medicationDosage, setMedicationDosage] = useState(seededMedication.dosage);
  const [medicationRoute, setMedicationRoute] = useState(seededMedication.route);
  const [bloodPressure, setBloodPressure] = useState(seededVitals.bloodPressure);
  const [heartRate, setHeartRate] = useState(seededVitals.heartRate);
  const [temperature, setTemperature] = useState(seededVitals.temperature);

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        updateType,
        content,
        medicationsGiven:
          updateType === "MEDICATION" && medicationName
            ? [{ name: medicationName, dosage: medicationDosage, route: medicationRoute, givenAt: new Date() }]
            : undefined,
        vitalSigns:
          updateType === "VITAL_SIGNS" || updateType === "MEDICATION"
            ? {
                bloodPressure: bloodPressure || undefined,
                heartRate: heartRate ? Number(heartRate) : undefined,
                temperature: temperature ? Number(temperature) : undefined
              }
            : undefined,
        carePerformed,
        patientMood,
        isUrgent
      };
      return isEdit
        ? patientApi.updateUpdate(patientId, update!.id, body)
        : patientApi.createUpdate(patientId, body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Update saved" : "Patient update saved");
      void queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
      router.push(`/patients/${patientId}`);
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save update")
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
      className="space-y-6"
    >
      <section className="grid gap-3 md:grid-cols-3">
        {updateTypes.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setUpdateType(item.value)}
            className={cn(
              "rounded-2xl border p-5 text-left transition",
              updateType === item.value ? "border-primary bg-blue-50 text-primary" : "border-border bg-white text-text"
            )}
          >
            <item.icon className="mb-3 h-7 w-7" />
            <span className="font-bold">{item.label}</span>
          </button>
        ))}
      </section>

      <label className="block">
        <span className="mb-2 block font-semibold text-text">Description</span>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="focus-ring min-h-40 w-full rounded-2xl border border-border p-4"
          required
        />
      </label>

      {updateType === "CARE" ? (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 font-bold text-text">Care Performed</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {careOptions.map((option) => (
              <label key={option} className="flex items-center gap-3 rounded-xl bg-white p-3">
                <input
                  type="checkbox"
                  checked={carePerformed.includes(option)}
                  onChange={(event) =>
                    setCarePerformed((current) =>
                      event.target.checked ? [...current, option] : current.filter((item) => item !== option)
                    )
                  }
                />
                {option}
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {updateType === "MEDICATION" ? (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 font-bold text-text">Medication Entry</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input value={medicationName} onChange={(event) => setMedicationName(event.target.value)} className="focus-ring rounded-xl border border-border px-4 py-3" placeholder="Medication name" />
            <input value={medicationDosage} onChange={(event) => setMedicationDosage(event.target.value)} className="focus-ring rounded-xl border border-border px-4 py-3" placeholder="Dose" />
            <input value={medicationRoute} onChange={(event) => setMedicationRoute(event.target.value)} className="focus-ring rounded-xl border border-border px-4 py-3" placeholder="Route: oral/IV" />
          </div>
        </section>
      ) : null}

      {updateType === "VITAL_SIGNS" || updateType === "MEDICATION" ? (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 font-bold text-text">Vital Signs</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input value={bloodPressure} onChange={(event) => setBloodPressure(event.target.value)} className="focus-ring rounded-xl border border-border px-4 py-3" placeholder="Blood pressure 120/80" />
            <input value={heartRate} onChange={(event) => setHeartRate(event.target.value)} className="focus-ring rounded-xl border border-border px-4 py-3" placeholder="Heart rate" type="number" />
            <input value={temperature} onChange={(event) => setTemperature(event.target.value)} className="focus-ring rounded-xl border border-border px-4 py-3" placeholder="Temperature" type="number" step="0.1" />
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="mb-3 font-bold text-text">Patient Mood</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["GOOD", "Good", "bg-green-100 text-green-800 border-green-300"],
            ["MODERATE", "Moderate", "bg-yellow-100 text-yellow-800 border-yellow-300"],
            ["BAD", "Poor", "bg-red-100 text-red-800 border-red-300"]
          ].map(([value, label, classes]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPatientMood(value as "GOOD" | "MODERATE" | "BAD")}
              className={cn("rounded-2xl border p-4 font-bold", patientMood === value ? classes : "border-border bg-white text-muted")}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <label className="flex items-center justify-between rounded-2xl border border-red-300 bg-red-50 p-5 text-red-800">
        <span className="font-bold">Mark this update as an emergency</span>
        <input type="checkbox" checked={isUrgent} onChange={(event) => setIsUrgent(event.target.checked)} className="h-5 w-5" />
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
          {isEdit ? "Save Changes" : "Save"}
        </button>
        {isEdit ? (
          <button
            type="button"
            onClick={() => router.push(`/patients/${patientId}`)}
            className="rounded-xl border border-border px-6 py-3 font-semibold text-muted"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
