"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/lib/api/admin.api";

export default function NewUserPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "Employee123!",
    role: "EMPLOYEE",
    isActive: true
  });

  const mutation = useMutation({
    mutationFn: () => adminApi.createUser(form),
    onSuccess: () => {
      toast.success("Employee created");
      router.push("/admin/users");
    },
    onError: () => toast.error("Could not create employee")
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
      className="mx-auto max-w-3xl space-y-5 rounded-3xl border border-border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-bold text-text">New Employee</h2>
        <p className="text-sm text-muted">The password is hashed by the API with bcrypt (cost 12).</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="First name" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} />
        <Input label="Last name" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} />
        <Input label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
        <Input label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-text">Role</span>
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="focus-ring w-full rounded-xl border border-border px-4 py-3">
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
          <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
          Active
        </label>
      </div>
      <button className="rounded-xl bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60" disabled={mutation.isPending}>
        Save
      </button>
    </form>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-text">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="focus-ring w-full rounded-xl border border-border px-4 py-3" />
    </label>
  );
}
