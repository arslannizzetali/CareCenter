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
    disabilityType: "",
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
    emergencyContactRelation: "Family",
    notes: ""
  });

  const mutation = useMutation({
    mutationFn: () =>
      patientApi.create({
        ...form,
        tcNumber: form.tcNumber.trim() || undefined,
        disabilityType: form.disabilityType || undefined
      }),
    onSuccess: (patient) => {
      toast.success("Resident saved");
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
        <h2 className="text-xl font-bold text-text">New Resident</h2>
        <p className="text-sm text-muted">If a national ID is entered, it is stored encrypted by the API.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="First name"
          value={form.firstName}
          onChange={(value) => setForm({ ...form, firstName: value })}
          required
          minLength={2}
          maxLength={50}
          pattern={turkishNamePattern}
          title="Use only letters, spaces, apostrophes and hyphens"
        />
        <Input
          label="Last name"
          value={form.lastName}
          onChange={(value) => setForm({ ...form, lastName: value })}
          required
          minLength={2}
          maxLength={50}
          pattern={turkishNamePattern}
          title="Use only letters, spaces, apostrophes and hyphens"
        />
        <Input
          label="Date of birth"
          type="date"
          value={form.birthDate}
          onChange={(value) => setForm({ ...form, birthDate: value })}
          required
        />
        <Select label="Gender" value={form.gender} onChange={(value) => setForm({ ...form, gender: value })} options={[["MALE", "Male"], ["FEMALE", "Female"]]} />
        <Input
          label="National ID"
          value={form.tcNumber}
          onChange={(value) => setForm({ ...form, tcNumber: value })}
          inputMode="numeric"
          maxLength={11}
          pattern="[0-9]{11}"
          title="National ID must be 11 digits"
        />
        <Input label="Room" value={form.roomNumber} onChange={(value) => setForm({ ...form, roomNumber: value })} maxLength={20} />
        <Select label="Care type" value={form.careType} onChange={(value) => setForm({ ...form, careType: value })} options={[["ELDERLY", "Elderly"], ["DISABLED", "Physically Disabled"], ["BOTH", "Both"]]} />
        {form.careType === "DISABLED" || form.careType === "BOTH" ? (
          <Select
            label="Disability type"
            value={form.disabilityType}
            onChange={(value) => setForm({ ...form, disabilityType: value })}
            options={[["", "Not specified"], ["PHYSICAL", "Physical"], ["MENTAL", "Mental"], ["BOTH", "Both"]]}
          />
        ) : null}
        <Select label="Mobility" value={form.mobilityLevel} onChange={(value) => setForm({ ...form, mobilityLevel: value })} options={[["INDEPENDENT", "Independent"], ["ASSISTED", "Assisted"], ["BEDRIDDEN", "Bedridden"]]} />
        <Input
          label="Emergency contact"
          value={form.emergencyContactName}
          onChange={(value) => setForm({ ...form, emergencyContactName: value })}
          required
          minLength={2}
          maxLength={100}
        />
        <Input
          label="Emergency phone"
          value={form.emergencyContactPhone}
          onChange={(value) => setForm({ ...form, emergencyContactPhone: value })}
          required
          inputMode="tel"
          pattern="(\\+90|0)?[1-9][0-9]{9}"
          title="Enter the phone as 05321234567, 5321234567 or +905321234567"
        />
      </div>
      <Input label="Allergies" value={form.allergies} onChange={(value) => setForm({ ...form, allergies: value })} maxLength={5000} />
      <Input
        label="Current medications"
        value={form.currentMedications}
        onChange={(value) => setForm({ ...form, currentMedications: value })}
        maxLength={5000}
      />
      <button className="rounded-xl bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60" disabled={mutation.isPending}>
        Save
      </button>
    </form>
  );
}

const turkishNamePattern = "[a-zA-ZçğıöşüÇĞİÖŞÜ\\s'-]+";

const fieldLabels: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  birthDate: "Date of birth",
  gender: "Gender",
  tcNumber: "National ID",
  careType: "Care type",
  roomNumber: "Room",
  admissionDate: "Admission date",
  status: "Status",
  mobilityLevel: "Mobility",
  emergencyContactName: "Emergency contact",
  emergencyContactPhone: "Emergency phone",
  emergencyContactRelation: "Relationship",
  allergies: "Allergies",
  currentMedications: "Current medications"
};

function formatPatientError(error: unknown): string {
  if (error instanceof ApiClientError && error.details?.length) {
    const firstDetail = error.details[0];
    if (!firstDetail) {
      return error.message;
    }
    const label = firstDetail.field ? fieldLabels[firstDetail.field] ?? firstDetail.field : "Field";
    const message = firstDetail.message === "Invalid" ? "is not valid" : firstDetail.message;
    return `${label}: ${message}`;
  }

  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "Could not save resident";
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
