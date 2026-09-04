"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { publicApi } from "@/lib/api/public.api";

export function DemoRequestForm({ onDone }: { onDone: () => void }) {
  const [institutionName, setInstitutionName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      publicApi.submitDemoRequest({
        institutionName,
        contactName,
        phone,
        email,
        ...(message ? { message } : {})
      }),
    onSuccess: () => {
      toast.success("Talebiniz alındı, en kısa sürede size ulaşacağız.");
      onDone();
    },
    onError: () => toast.error("Talep gönderilemedi. Lütfen bilgileri kontrol edip tekrar deneyin.")
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <p className="text-sm text-muted">Kurum bilgilerinizi bırakın, size dönüş yapalım.</p>

      <Field label="Kurum Adı" value={institutionName} onChange={setInstitutionName} placeholder="Örn. Çamlıca Bakım Merkezi" />
      <Field label="Yetkili Adı" value={contactName} onChange={setContactName} placeholder="Ad Soyad" />
      <Field label="Telefon" value={phone} onChange={setPhone} placeholder="05XXXXXXXXX" type="tel" />
      <Field label="E-posta" value={email} onChange={setEmail} placeholder="kurum@ornek.com" type="email" />

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-text">Mesaj (opsiyonel)</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          className="focus-ring w-full rounded-xl border border-border px-4 py-3 text-text"
        />
      </label>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-xl border border-border px-4 py-3 font-semibold text-text hover:bg-surface"
        >
          Vazgeç
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex-1 rounded-xl bg-primary px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? "Gönderiliyor..." : "Talebi Gönder"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-text">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        className="focus-ring w-full rounded-xl border border-border px-4 py-3 text-text"
        required
      />
    </label>
  );
}
