"use client";

import { FileText } from "lucide-react";
import type { DocumentItem } from "@/types";
import { formatDateTime } from "@/lib/locale";
import { useAuth } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/lib/store/auth.store";
import { patientApi } from "@/lib/api/patient.api";
import { toast } from "sonner";

interface DocumentListProps {
  title: string;
  hint?: string;
  documents: DocumentItem[];
  tone: "red" | "yellow" | "green";
}

export function DocumentList({ title, hint, documents, tone }: DocumentListProps) {
  const { canAdmin } = useAuth();
  const accessToken = useAuthStore((state) => state.accessToken);

  async function download(document: DocumentItem): Promise<void> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"}/documents/${document.id}/download`,
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        credentials: "include"
      }
    );
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = document.fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function deleteDocument(document: DocumentItem): Promise<void> {
    try {
      await patientApi.deleteDocument(document.id);
      toast.success("Evrak silindi");
    } catch {
      toast.error("Evrak silinemedi");
    }
  }

  async function changePriority(document: DocumentItem, priority: "RED" | "YELLOW" | "GREEN"): Promise<void> {
    try {
      await patientApi.changeDocumentPriority(document.id, priority);
      toast.success("Öncelik güncellendi");
    } catch {
      toast.error("Öncelik güncellenemedi");
    }
  }

  return (
    <section className={`rounded-2xl border p-5 ${toneClass(tone)}`}>
      <div className="mb-4">
        <h3 className="text-lg font-bold">{title} ({documents.length} adet)</h3>
        {hint ? <p className="mt-1 text-sm opacity-80">{hint}</p> : null}
      </div>
      <div className="space-y-3">
        {documents.map((document) => (
          <article key={document.id} className="rounded-xl border border-white/70 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6" />
                <div>
                  <p className="font-semibold text-text">{document.fileName}</p>
                  <p className="text-xs text-muted">
                    {(document.fileSize / 1024 / 1024).toFixed(1)} MB | {formatDateTime(document.uploadedAt)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void download(document)}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary"
                >
                  İndir
                </button>
                {canAdmin() && document.priority !== "RED" ? (
                  <button
                    onClick={() => void deleteDocument(document)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-danger"
                  >
                    Sil
                  </button>
                ) : null}
                {canAdmin() ? (
                  <select
                    value={document.priority}
                    onChange={(event) => void changePriority(document, event.target.value as "RED" | "YELLOW" | "GREEN")}
                    className="rounded-lg border border-border px-2 py-2 text-sm"
                  >
                    <option value="RED">Kırmızı</option>
                    <option value="YELLOW">Sarı</option>
                    <option value="GREEN">Yeşil</option>
                  </select>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {!documents.length ? <p className="rounded-xl bg-white p-4 text-sm text-muted">Evrak yok.</p> : null}
      </div>
    </section>
  );
}

function toneClass(tone: DocumentListProps["tone"]): string {
  if (tone === "red") {
    return "border-red-300 bg-red-50 text-red-800";
  }
  if (tone === "yellow") {
    return "border-yellow-300 bg-yellow-50 text-yellow-800";
  }
  return "border-green-300 bg-green-50 text-green-800";
}
