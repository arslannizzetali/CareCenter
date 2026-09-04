"use client";

import { useParams } from "next/navigation";
import { PatientUpdateForm } from "@/components/forms/patient-update-form";

export default function PatientUpdatePage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text">Yeni Güncelleme Gir</h2>
        <p className="text-muted">İlaç, bakım, gözlem, vital bulgu veya olay kaydı ekleyin.</p>
      </div>
      <PatientUpdateForm patientId={params.id} />
    </div>
  );
}
