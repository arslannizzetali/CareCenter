"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Info, Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { patientApi } from "@/lib/api/patient.api";
import { formatDateTime } from "@/lib/locale";
import { UpdateCard } from "@/components/patients/update-card";
import { DocumentList } from "@/components/documents/document-list";
import type { PatientStatus } from "@bakimevi/shared-types";

const statusLabels: Record<PatientStatus, string> = {
  ACTIVE: "Aktif",
  DISCHARGED: "Taburcu",
  TRANSFERRED: "Transfer"
};

const statusStyles: Record<PatientStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  DISCHARGED: "bg-gray-200 text-gray-800",
  TRANSFERRED: "bg-blue-100 text-blue-800"
};

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const patientQuery = useQuery({
    queryKey: ["patient", params.id],
    queryFn: () => patientApi.get(params.id)
  });
  const documentsQuery = useQuery({
    queryKey: ["documents", params.id],
    queryFn: () => patientApi.documents(params.id)
  });

  const statusMutation = useMutation({
    mutationFn: (status: PatientStatus) => patientApi.update(params.id, { status }),
    onSuccess: () => {
      toast.success("Hasta durumu güncellendi");
      void queryClient.invalidateQueries({ queryKey: ["patient", params.id] });
    },
    onError: () => toast.error("Durum güncellenemedi")
  });

  const deleteMutation = useMutation({
    mutationFn: () => patientApi.delete(params.id),
    onSuccess: () => {
      toast.success("Hasta kaydı silindi");
      router.push("/patients");
    },
    onError: () => toast.error("Hasta silinemedi")
  });

  const patient = patientQuery.data;

  if (!patient) {
    return <div className="h-96 animate-pulse rounded-3xl bg-surface" />;
  }

  function handleDelete(): void {
    if (window.confirm(`${patient!.firstName} ${patient!.lastName} kaydını silmek istediğine emin misin? Bu işlem geri alınamaz.`)) {
      deleteMutation.mutate();
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-blue-50 p-4 text-primary">
              <UserRound className="h-9 w-9" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-text">
                {patient.firstName} {patient.lastName}
              </h2>
              <p className="text-muted">
                {patient.gender === "MALE" ? "Erkek" : "Kadın"} | Oda: {patient.roomNumber ?? "-"} | {patient.careType}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <select
              value={patient.status}
              disabled={statusMutation.isPending}
              onChange={(event) => statusMutation.mutate(event.target.value as PatientStatus)}
              className={`rounded-full border-0 px-4 py-2 text-sm font-bold focus-ring ${statusStyles[patient.status]}`}
            >
              {(Object.keys(statusLabels) as PatientStatus[]).map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-danger hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hastayı Sil
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoBox label="Giriş" value={formatDateTime(patient.admissionDate)} />
          <InfoBox label="Alerjiler" value={patient.allergies ?? "-"} danger />
          <InfoBox label="Süregelen ilaçlar" value={patient.currentMedications ?? "-"} />
          <InfoBox label="Hareketlilik" value={patient.mobilityLevel} />
        </div>
        <div className="mt-4 rounded-2xl bg-surface p-4 text-sm text-text">
          Acil İletişim: {patient.emergencyContactName} ({patient.emergencyContactRelation}) - {patient.emergencyContactPhone}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_430px]">
        <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xl font-bold text-text">
              <Plus className="h-5 w-5" /> Güncellemeler
            </h3>
            <Link href={`/patients/${patient.id}/update`} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
              Yeni Güncelleme Ekle
            </Link>
          </div>
          <div className="space-y-3">
            {patient.patientUpdates?.map((update) => <UpdateCard key={update.id} update={update} />)}
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href={`/patients/${patient.id}/documents`}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white p-4 font-semibold text-primary shadow-sm"
          >
            <FileText className="h-5 w-5" />
            Evrak Yükle / Yönet
          </Link>
          <DocumentList title="Kritik Evraklar" hint="Bu evraklar hiçbir zaman silinemez" documents={documentsQuery.data?.red ?? []} tone="red" />
          <DocumentList title="Yarı Önemli Evraklar" documents={documentsQuery.data?.yellow ?? []} tone="yellow" />
          <DocumentList title="Standart Evraklar" documents={documentsQuery.data?.green ?? []} tone="green" />
        </div>
      </section>
    </div>
  );
}

function InfoBox({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${danger ? "bg-red-50 text-red-800" : "bg-surface text-text"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
