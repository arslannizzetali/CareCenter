"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api/admin.api";
import { documentTypeApi } from "@/lib/api/document.api";

export default function AdminSettingsPage() {
  const [yellowDays, setYellowDays] = useState(90);
  const [greenDays, setGreenDays] = useState(30);
  const [yellowEnabled, setYellowEnabled] = useState(true);
  const [greenEnabled, setGreenEnabled] = useState(true);

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateRetentionPolicies({
        yellow: { retentionDays: yellowDays, autoDeleteEnabled: yellowEnabled },
        green: { retentionDays: greenDays, autoDeleteEnabled: greenEnabled }
      }),
    onSuccess: () => toast.success("Retention policies updated"),
    onError: () => toast.error("Could not save settings")
  });

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-text">Document Retention Policies</h2>
        <PolicyCard
          title="Yellow Documents"
          tone="yellow"
          enabled={yellowEnabled}
          setEnabled={setYellowEnabled}
          days={yellowDays}
          setDays={setYellowDays}
        />
        <PolicyCard
          title="Green Documents"
          tone="green"
          enabled={greenEnabled}
          setEnabled={setGreenEnabled}
          days={greenDays}
          setDays={setGreenDays}
        />
        <button
          onClick={() => mutation.mutate()}
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
          disabled={mutation.isPending}
        >
          Save
        </button>
      </div>

      <DocumentTypeManager />
    </div>
  );
}

function DocumentTypeManager() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const typesQuery = useQuery({
    queryKey: ["document-types", "all"],
    queryFn: () => documentTypeApi.list(true)
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["document-types"] });

  const createMutation = useMutation({
    mutationFn: () => documentTypeApi.create({ name: name.trim() }),
    onSuccess: () => {
      toast.success("Document type added");
      setName("");
      void invalidate();
    },
    onError: () => toast.error("Could not add (the name may already exist)")
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, current, isActive }: { id: string; current: string; isActive: boolean }) =>
      documentTypeApi.update(id, { name: current, isActive }),
    onSuccess: invalidate,
    onError: () => toast.error("Could not update")
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => documentTypeApi.remove(id),
    onSuccess: () => {
      toast.success("Removed");
      void invalidate();
    },
    onError: () => toast.error("Could not remove")
  });

  return (
    <section className="rounded-3xl border border-border bg-white p-6">
      <h2 className="mb-1 text-xl font-bold text-text">Document Types</h2>
      <p className="mb-4 text-sm text-muted">
        Columns of the document matrix. Types that are in use or built in are deactivated instead of deleted.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) createMutation.mutate();
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New type name (e.g. Disability Health Report)"
          className="focus-ring flex-1 rounded-xl border border-border px-4 py-2.5"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      <ul className="divide-y divide-border">
        {typesQuery.data?.map((type) => (
          <li key={type.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className={`text-sm ${type.isActive ? "text-text" : "text-muted line-through"}`}>
              {type.name}
              {type.isSystem ? <span className="ml-2 text-xs text-muted">(system)</span> : null}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  toggleMutation.mutate({ id: type.id, current: type.name, isActive: !type.isActive })
                }
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted"
              >
                {type.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => removeMutation.mutate(type.id)}
                className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-danger"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PolicyCard({
  title,
  tone,
  enabled,
  setEnabled,
  days,
  setDays
}: {
  title: string;
  tone: "yellow" | "green";
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  days: number;
  setDays: (value: number) => void;
}) {
  return (
    <section className={`rounded-3xl border p-6 ${tone === "yellow" ? "border-yellow-300 bg-yellow-50" : "border-green-300 bg-green-50"}`}>
      <h2 className="mb-4 text-xl font-bold text-text">{title}</h2>
      <label className="mb-4 flex items-center justify-between rounded-2xl bg-white p-4">
        <span className="font-semibold">Automatic deletion</span>
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
      </label>
      <label className="block rounded-2xl bg-white p-4">
        <span className="mb-2 block font-semibold">Days after upload</span>
        <input
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          type="number"
          min={0}
          className="focus-ring w-full rounded-xl border border-border px-4 py-3"
        />
      </label>
    </section>
  );
}
