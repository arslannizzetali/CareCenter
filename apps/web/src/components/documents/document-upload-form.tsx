"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { patientApi } from "@/lib/api/patient.api";
import { documentTypeApi } from "@/lib/api/document.api";
import { cn } from "@/lib/utils";

const priorities = [
  { value: "RED", title: "Red", description: "Critical, can never be deleted", className: "border-red-300 bg-red-50 text-red-800" },
  { value: "YELLOW", title: "Yellow", description: "Semi-important, kept for 90 days", className: "border-yellow-300 bg-yellow-50 text-yellow-800" },
  { value: "GREEN", title: "Green", description: "Standard, kept for 30 days", className: "border-green-300 bg-green-50 text-green-800" }
] as const;

export function DocumentUploadForm() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [priority, setPriority] = useState<(typeof priorities)[number]["value"]>("GREEN");
  const [documentTypeId, setDocumentTypeId] = useState<string>("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [progress, setProgress] = useState(0);

  const typesQuery = useQuery({ queryKey: ["document-types"], queryFn: () => documentTypeApi.list() });

  useEffect(() => {
    const preset = searchParams.get("type");
    if (preset) {
      setDocumentTypeId(preset);
    }
  }, [searchParams]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("No file selected");
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("priority", priority);
      if (documentTypeId) {
        formData.append("documentTypeId", documentTypeId);
      }
      if (!noExpiry && expiresAt) {
        formData.append("expiresAt", expiresAt);
      }
      setProgress(35);
      const result = await patientApi.uploadDocument(params.id, formData);
      setProgress(100);
      return result;
    },
    onSuccess: () => {
      toast.success("Document uploaded securely");
      setFile(null);
      setProgress(0);
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      void queryClient.invalidateQueries({ queryKey: ["document-matrix"] });
      void queryClient.invalidateQueries({ queryKey: ["patient", params.id] });
      if (searchParams.get("return") === "matrix") {
        router.push("/documents");
      }
    },
    onError: () => {
      toast.error("Could not upload document");
      setProgress(0);
    }
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
      className="space-y-6"
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setFile(event.dataTransfer.files.item(0));
        }}
        className="flex min-h-52 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-surface p-8 text-center transition hover:border-primary hover:bg-blue-50"
      >
        <UploadCloud className="mb-4 h-12 w-12 text-primary" />
        <span className="text-lg font-bold text-text">{file ? file.name : "Drop a file here or choose one"}</span>
        <span className="mt-2 text-sm text-muted">PDF, JPEG, PNG, WEBP, DOCX, XLSX - maximum 50MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block font-semibold text-text">Document type</span>
          <select
            value={documentTypeId}
            onChange={(event) => setDocumentTypeId(event.target.value)}
            className="focus-ring w-full rounded-xl border border-border px-4 py-3"
          >
            <option value="">Not specified / Other</option>
            {typesQuery.data?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>

        <div className="block">
          <span className="mb-2 block font-semibold text-text">Expiry date</span>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={expiresAt}
              disabled={noExpiry}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="focus-ring w-full rounded-xl border border-border px-4 py-3 disabled:bg-surface disabled:text-muted"
            />
            <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-muted">
              <input
                type="checkbox"
                checked={noExpiry}
                onChange={(event) => setNoExpiry(event.target.checked)}
              />
              No expiry
            </label>
          </div>
          <span className="mt-1 block text-xs text-muted">A notification is sent to the admin panel 1 month before expiry.</span>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {priorities.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setPriority(item.value)}
            className={cn("rounded-2xl border p-5 text-left", priority === item.value ? item.className : "border-border bg-white text-text")}
          >
            <p className="text-lg font-bold">{item.title}</p>
            <p className="mt-2 text-sm">{item.description}</p>
          </button>
        ))}
      </section>

      {progress > 0 ? (
        <div className="h-3 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!file || mutation.isPending || (!noExpiry && !expiresAt)}
        className="rounded-xl bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        Upload
      </button>
    </form>
  );
}
