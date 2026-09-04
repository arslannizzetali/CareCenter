"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ClipboardCheck, Eye, HeartPulse, Pill, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { patientApi } from "@/lib/api/patient.api";
import { cn } from "@/lib/utils";

const updateTypes = [
  { value: "MEDICATION", label: "İlaç Verildi", icon: Pill },
  { value: "CARE", label: "Bakım Yapıldı", icon: ClipboardCheck },
  { value: "OBSERVATION", label: "Gözlem", icon: Eye },
  { value: "STATUS_CHANGE", label: "Durum Değişti", icon: RefreshCcw },
  { value: "VITAL_SIGNS", label: "Vital Bulgular", icon: HeartPulse },
  { value: "INCIDENT", label: "Olay/Kaza", icon: AlertTriangle }
] as const;

const careOptions = ["Banyo yardımı", "Beslenme yardımı", "Fizik tedavi", "Yara bakımı", "Psikolojik destek", "Egzersiz", "İlaç hatırlatma", "Kıyafet değişimi"];

export function PatientUpdateForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [updateType, setUpdateType] = useState<(typeof updateTypes)[number]["value"]>("OBSERVATION");
  const [content, setContent] = useState("");
  const [patientMood, setPatientMood] = useState<"GOOD" | "MODERATE" | "BAD">("GOOD");
  const [isUrgent, setIsUrgent] = useState(false);
  const [carePerformed, setCarePerformed] = useState<string[]>([]);
  const [medicationName, setMedicationName] = useState("");
  const [medicationDosage, setMedicationDosage] = useState("");
  const [medicationRoute, setMedicationRoute] = useState("oral");
  const [bloodPressure, setBloodPressure] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [temperature, setTemperature] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      patientApi.createUpdate(patientId, {
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
      }),
    onSuccess: () => {
      toast.success("Hasta güncellemesi kaydedildi");
      router.push(`/patients/${patientId}`);
    },
    onError: () => toast.error("Güncelleme kaydedilemedi")
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
        <span className="mb-2 block font-semibold text-text">Açıklama</span>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="focus-ring min-h-40 w-full rounded-2xl border border-border p-4"
          required
        />
      </label>

      {updateType === "CARE" ? (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 font-bold text-text">Yapılan Bakım</h3>
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
          <h3 className="mb-3 font-bold text-text">İlaç Girişi</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input value={medicationName} onChange={(event) => setMedicationName(event.target.value)} className="focus-ring rounded-xl border border-border px-4 py-3" placeholder="İlaç adı" />
            <input value={medicationDosage} onChange={(event) => setMedicationDosage(event.target.value)} className="focus-ring rounded-xl border border-border px-4 py-3" placeholder="Doz" />
            <input value={medicationRoute} onChange={(event) => setMedicationRoute(event.target.value)} className="focus-ring rounded-xl border border-border px-4 py-3" placeholder="Yol: oral/IV" />
          </div>
        </section>
      ) : null}

      {updateType === "VITAL_SIGNS" || updateType === "MEDICATION" ? (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 font-bold text-text">Vital Bulgular</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input value={bloodPressure} onChange={(event) => setBloodPressure(event.target.value)} className="focus-ring rounded-xl border border-border px-4 py-3" placeholder="Tansiyon 120/80" />
            <input value={heartRate} onChange={(event) => setHeartRate(event.target.value)} className="focus-ring rounded-xl border border-border px-4 py-3" placeholder="Nabız" type="number" />
            <input value={temperature} onChange={(event) => setTemperature(event.target.value)} className="focus-ring rounded-xl border border-border px-4 py-3" placeholder="Ateş" type="number" step="0.1" />
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="mb-3 font-bold text-text">Hasta Ruh Hali</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["GOOD", "İyi", "bg-green-100 text-green-800 border-green-300"],
            ["MODERATE", "Orta", "bg-yellow-100 text-yellow-800 border-yellow-300"],
            ["BAD", "Kötü", "bg-red-100 text-red-800 border-red-300"]
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
        <span className="font-bold">Bu güncelleme acil durum bildirimi</span>
        <input type="checkbox" checked={isUrgent} onChange={(event) => setIsUrgent(event.target.checked)} className="h-5 w-5" />
      </label>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-xl bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        Kaydet
      </button>
    </form>
  );
}
