"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { patientApi } from "@/lib/api/patient.api";
import { PatientUpdateForm } from "@/components/forms/patient-update-form";

export default function EditPatientUpdatePage() {
  const params = useParams<{ id: string; updateId: string }>();

  const query = useQuery({
    queryKey: ["patient", params.id],
    queryFn: () => patientApi.get(params.id)
  });

  const update = query.data?.patientUpdates?.find((item) => item.id === params.updateId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text">Edit Update</h2>
        <p className="text-muted">Modify the saved update details.</p>
      </div>

      {query.isLoading ? <div className="h-96 animate-pulse rounded-3xl bg-surface" /> : null}

      {!query.isLoading && !update ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-muted">
          Update not found or you don't have permission to edit it.{" "}
          <Link href={`/patients/${params.id}`} className="font-semibold text-primary">
            Go back
          </Link>
        </div>
      ) : null}

      {update ? <PatientUpdateForm patientId={params.id} update={update} /> : null}
    </div>
  );
}
