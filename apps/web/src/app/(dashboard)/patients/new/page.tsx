"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { patientApi } from "@/lib/api/patient.api";
import { ApiClientError } from "@/lib/api/client";

export default function NewPatientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    birthDate: "1950-01-01",
    gender: "MALE",
    tcNumber: "",
    careType: "ELDERLY",
    roomNumber: "",
    admissionDate: new Date().toISOString().slice(0, 10),
    status: "ACTIVE",
    diagnosis: "",
    allergies: "",
    currentMedications: "",
    mobilityLevel: "ASSISTED",
    dietaryNeeds: "",
    emergencyContactName: "",
    emergencyContactPhone: "05321234567",
    emergencyContactRelation: "Aile",
    notes: ""
  });

  const mutation = useMutation({
    mutationFn: () => patientApi.create({ ...form, tcNumber: form.tcNumber.trim() || undefined }),
    onSuccess: (patient) => {
      toast.success("Hasta kaydedildi");
      router.push(`/patients/${patient.id}`);
    },
    onError: (error) => toast.error(formatPatientError(error))
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
      className="mx-auto max-w-5xl space-y-5 rounded-3xl border border-border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-bold text-text">Yeni Hasta</h2>
        <p className="text-sm text-muted">TC kimlik girilirse API tarafında şifreli saklanır.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Ad"
          value={form.firstName}
          onChange={(value) => setForm({ ...form, firstName: value })}
          required
          minLength={2}
          maxLength={50}
          pattern={turkishNamePattern}
          title="Sadece harf, boşluk, apostrof ve tire kullanın"
        />
        <Input
          label="Soyad"
          value={form.lastName}
          onChange={(value) => setForm({ ...form, lastName: value })}
          required
          minLength={2}
          maxLength={50}
          pattern={turkishNamePattern}
          title="Sadece harf, boşluk, apostrof ve tire kullanın"
        />
        <Input
          label="Doğum tarihi"
          type="date"
          value={form.birthDate}
          onChange={(value) => setForm({ ...form, birthDate: value })}
          required
        />
        <Select label="Cinsiyet" value={form.gender} onChange={(value) => setForm({ ...form, gender: value })} options={[["MALE", "Erkek"], ["FEMALE", "Kadın"]]} />
        <Input
          label="TC Kimlik"
          value={form.tcNumber}
          onChange={(value) => setForm({ ...form, tcNumber: value })}
          inputMode="numeric"
          maxLength={11}
          pattern="[0-9]{11}"
          title="TC kimlik 11 rakam olmalıdır"
        />
        <Input label="Oda" value={form.roomNumber} onChange={(value) => setForm({ ...form, roomNumber: value })} maxLength={20} />
        <Select label="Bakım türü" value={form.careType} onChange={(value) => setForm({ ...form, careType: value })} options={[["ELDERLY", "Yaşlı"], ["DISABLED", "Engelli"], ["BOTH", "Her İkisi"]]} />
        <Select label="Hareketlilik" value={form.mobilityLevel} onChange={(value) => setForm({ ...form, mobilityLevel: value })} options={[["INDEPENDENT", "Bağımsız"], ["ASSISTED", "Yardımlı"], ["BEDRIDDEN", "Yatağa bağımlı"]]} />
        <Input
          label="Acil kişi"
          value={form.emergencyContactName}
          onChange={(value) => setForm({ ...form, emergencyContactName: value })}
          required
          minLength={2}
          maxLength={100}
        />
        <Input
          label="Acil telefon"
          value={form.emergencyContactPhone}
          onChange={(value) => setForm({ ...form, emergencyContactPhone: value })}
          required
          inputMode="tel"
          pattern="(\\+90|0)?[1-9][0-9]{9}"
          title="Telefonu 05321234567, 5321234567 veya +905321234567 formatında girin"
        />
      </div>
      <Input label="Alerjiler" value={form.allergies} onChange={(value) => setForm({ ...form, allergies: value })} maxLength={5000} />
      <Input
        label="Süregelen ilaçlar"
        value={form.currentMedications}
        onChange={(value) => setForm({ ...form, currentMedications: value })}
        maxLength={5000}
      />
      <button className="rounded-xl bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60" disabled={mutation.isPending}>
        Kaydet
      </button>
    </form>
  );
}

const turkishNamePattern = "[a-zA-ZçğıöşüÇĞİÖŞÜ\\s'-]+";

const fieldLabels: Record<string, string> = {
  firstName: "Ad",
  lastName: "Soyad",
  birthDate: "Doğum tarihi",
  gender: "Cinsiyet",
  tcNumber: "TC Kimlik",
  careType: "Bakım türü",
  roomNumber: "Oda",
  admissionDate: "Kabul tarihi",
  status: "Durum",
  mobilityLevel: "Hareketlilik",
  emergencyContactName: "Acil kişi",
  emergencyContactPhone: "Acil telefon",
  emergencyContactRelation: "Yakınlık",
  allergies: "Alerjiler",
  currentMedications: "Süregelen ilaçlar"
};

function formatPatientError(error: unknown): string {
  if (error instanceof ApiClientError && error.details?.length) {
    const firstDetail = error.details[0];
    if (!firstDetail) {
      return error.message;
    }
    const label = firstDetail.field ? fieldLabels[firstDetail.field] ?? firstDetail.field : "Alan";
    const message = firstDetail.message === "Invalid" ? "geçerli değil" : firstDetail.message;
    return `${label}: ${message}`;
  }

  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "Hasta kaydedilemedi";
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  ...inputProps
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-text">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        className="focus-ring w-full rounded-xl border border-border px-4 py-3"
        {...inputProps}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-text">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring w-full rounded-xl border border-border px-4 py-3">
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}
