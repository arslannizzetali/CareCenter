"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/lib/api/admin.api";

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
    onSuccess: () => toast.success("Silme politikaları güncellendi"),
    onError: () => toast.error("Ayarlar kaydedilemedi")
  });

  return (
    <div className="max-w-3xl space-y-5">
      <PolicyCard
        title="Sarı Evraklar"
        tone="yellow"
        enabled={yellowEnabled}
        setEnabled={setYellowEnabled}
        days={yellowDays}
        setDays={setYellowDays}
      />
      <PolicyCard
        title="Yeşil Evraklar"
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
        Kaydet
      </button>
    </div>
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
        <span className="font-semibold">Otomatik silme</span>
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
      </label>
      <label className="block rounded-2xl bg-white p-4">
        <span className="mb-2 block font-semibold">Yüklendikten kaç gün sonra</span>
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
