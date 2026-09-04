"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { patientApi } from "@/lib/api/patient.api";
import { cn } from "@/lib/utils";

const priorities = [
  { value: "RED", title: "Kırmızı", description: "Kritik, hiçbir zaman silinemez", className: "border-red-300 bg-red-50 text-red-800" },
  { value: "YELLOW", title: "Sarı", description: "Yarı önemli, 90 gün saklanır", className: "border-yellow-300 bg-yellow-50 text-yellow-800" },
  { value: "GREEN", title: "Yeşil", description: "Standart, 30 gün saklanır", className: "border-green-300 bg-green-50 text-green-800" }
] as const;

export function DocumentUploadForm() {
  const params = useParams<{ id: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [priority, setPriority] = useState<(typeof priorities)[number]["value"]>("GREEN");
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("Dosya seçilmedi");
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("priority", priority);
      setProgress(35);
      const result = await patientApi.uploadDocument(params.id, formData);
      setProgress(100);
      return result;
    },
    onSuccess: () => {
      toast.success("Evrak güvenli şekilde yüklendi");
      setFile(null);
      setProgress(0);
    },
    onError: () => {
      toast.error("Evrak yüklenemedi");
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
        <span className="text-lg font-bold text-text">{file ? file.name : "Dosyayı buraya bırakın veya seçin"}</span>
        <span className="mt-2 text-sm text-muted">PDF, JPEG, PNG, WEBP, DOCX, XLSX - maksimum 50MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />

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
        disabled={!file || mutation.isPending}
        className="rounded-xl bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        Yükle
      </button>
    </form>
  );
}
