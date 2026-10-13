"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { DocumentItem } from "@/types";
import { formatDate, formatDateTime } from "@/lib/locale";
import { expiryChipClass } from "@/lib/expiry";
import { useAuth } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/lib/store/auth.store";
import { patientApi } from "@/lib/api/patient.api";
import { documentApi, documentTypeApi } from "@/lib/api/document.api";

interface DocumentListProps {
  title: string;
  hint?: string;
  documents: DocumentItem[];
  tone: "red" | "yellow" | "green";
}

export function DocumentList({ title, hint, documents, tone }: DocumentListProps) {
  const { canAdmin } = useAuth();
  const currentUser = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const typesQuery = useQuery({ queryKey: ["document-types"], queryFn: () => documentTypeApi.list() });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["documents"] });
    void queryClient.invalidateQueries({ queryKey: ["document-matrix"] });
  };

  const metaMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { documentTypeId?: string | null; expiresAt?: string | null } }) =>
      documentApi.updateMeta(id, body),
    onSuccess: () => {
      toast.success("Document info updated");
      setEditingId(null);
      invalidate();
    },
    onError: () => toast.error("Could not update")
  });

  const priorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: "RED" | "YELLOW" | "GREEN" }) =>
      patientApi.changeDocumentPriority(id, priority),
    onSuccess: () => {
      toast.success("Priority updated");
      invalidate();
    },
    onError: () => toast.error("Could not update priority")
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => patientApi.deleteDocument(id),
    onSuccess: () => {
      toast.success("Document deleted");
      invalidate();
    },
    onError: () => toast.error("Could not delete document")
  });

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

  function canEdit(document: DocumentItem): boolean {
    return canAdmin() || document.uploadedBy.id === currentUser?.id;
  }

  return (
    <section className={`rounded-2xl border p-5 ${toneClass(tone)}`}>
      <div className="mb-4">
        <h3 className="text-lg font-bold">{title} ({documents.length})</h3>
        {hint ? <p className="mt-1 text-sm opacity-80">{hint}</p> : null}
      </div>
      <div className="space-y-3">
        {documents.map((document) => (
          <article key={document.id} className="rounded-xl border border-white/70 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-6 w-6 shrink-0" />
                <div>
                  <p className="font-semibold text-text">{document.fileName}</p>
                  <p className="text-xs text-muted">
                    {document.documentType?.name ?? "No type specified"} · {(document.fileSize / 1024 / 1024).toFixed(1)} MB ·{" "}
                    {formatDateTime(document.uploadedAt)}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${expiryChipClass(document.expiryStatus)}`}
                  >
                    {document.remainingLabel ?? "No expiry"}
                    {document.expiresAt ? ` · ${formatDate(document.expiresAt)}` : ""}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <button
                  onClick={() => void download(document)}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary"
                >
                  Download
                </button>
                {canEdit(document) ? (
                  <button
                    onClick={() => setEditingId(editingId === document.id ? null : document.id)}
                    className="rounded-lg border border-border px-2 py-2 text-sm font-semibold text-muted hover:text-primary"
                    title="Edit type / expiry"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                ) : null}
                {canAdmin() && document.priority !== "RED" ? (
                  <button
                    onClick={() => deleteMutation.mutate(document.id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-danger"
                  >
                    Delete
                  </button>
                ) : null}
                {canAdmin() ? (
                  <select
                    value={document.priority}
                    onChange={(event) =>
                      priorityMutation.mutate({ id: document.id, priority: event.target.value as "RED" | "YELLOW" | "GREEN" })
                    }
                    className="rounded-lg border border-border px-2 py-2 text-sm"
                  >
                    <option value="RED">Red</option>
                    <option value="YELLOW">Yellow</option>
                    <option value="GREEN">Green</option>
                  </select>
                ) : null}
              </div>
            </div>

            {editingId === document.id ? (
              <MetaEditor
                document={document}
                types={typesQuery.data ?? []}
                pending={metaMutation.isPending}
                onSave={(body) => metaMutation.mutate({ id: document.id, body })}
                onCancel={() => setEditingId(null)}
              />
            ) : null}
          </article>
        ))}
        {!documents.length ? <p className="rounded-xl bg-white p-4 text-sm text-muted">No documents.</p> : null}
      </div>
    </section>
  );
}

function MetaEditor({
  document,
  types,
  pending,
  onSave,
  onCancel
}: {
  document: DocumentItem;
  types: Array<{ id: string; name: string }>;
  pending: boolean;
  onSave: (body: { documentTypeId: string | null; expiresAt: string | null }) => void;
  onCancel: () => void;
}) {
  const [typeId, setTypeId] = useState(document.documentType?.id ?? "");
  const [noExpiry, setNoExpiry] = useState(!document.expiresAt);
  const [date, setDate] = useState(document.expiresAt ? document.expiresAt.slice(0, 10) : "");

  return (
    <div className="mt-3 grid gap-3 rounded-xl bg-surface p-3 sm:grid-cols-[1fr_1fr_auto]">
      <label className="block text-xs">
        <span className="mb-1 block font-semibold text-muted">Type</span>
        <select
          value={typeId}
          onChange={(event) => setTypeId(event.target.value)}
          className="focus-ring w-full rounded-lg border border-border px-2 py-1.5"
        >
          <option value="">Not specified</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs">
        <span className="mb-1 block font-semibold text-muted">Expiry date</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            disabled={noExpiry}
            onChange={(event) => setDate(event.target.value)}
            className="focus-ring w-full rounded-lg border border-border px-2 py-1.5 disabled:bg-white disabled:text-muted"
          />
          <label className="flex shrink-0 items-center gap-1 font-semibold text-muted">
            <input type="checkbox" checked={noExpiry} onChange={(event) => setNoExpiry(event.target.checked)} />
            No expiry
          </label>
        </div>
      </label>
      <div className="flex items-end gap-2">
        <button
          onClick={() =>
            onSave({ documentTypeId: typeId || null, expiresAt: noExpiry ? null : date || null })
          }
          disabled={pending}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          Save
        </button>
        <button onClick={onCancel} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted">
          Cancel
        </button>
      </div>
    </div>
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
