"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/lib/api/admin.api";
import { ApiClientError } from "@/lib/api/client";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  password: string;
}

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admin", "user", params.id],
    queryFn: () => adminApi.getUser(params.id)
  });

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    role: "EMPLOYEE",
    isActive: true,
    password: ""
  });

  useEffect(() => {
    if (query.data) {
      setForm({
        firstName: query.data.firstName,
        lastName: query.data.lastName,
        email: query.data.email,
        role: query.data.role,
        isActive: query.data.isActive ?? true,
        password: ""
      });
    }
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        role: form.role,
        isActive: form.isActive
      };
      if (form.password.trim()) {
        body.password = form.password.trim();
      }
      return adminApi.updateUser(params.id, body);
    },
    onSuccess: () => {
      toast.success("Staff member updated");
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "user", params.id] });
      router.push("/admin/users");
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update staff member")
  });

  if (query.isLoading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-surface" />;
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
      className="mx-auto max-w-3xl space-y-5 rounded-3xl border border-border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-bold text-text">Edit Staff Member</h2>
        <p className="text-sm text-muted">Leave the password field empty to keep the current password.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="First Name" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} />
        <Input label="Last Name" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} />
        <Input label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
        <Input
          label="New Password (optional)"
          type="password"
          value={form.password}
          onChange={(value) => setForm({ ...form, password: value })}
        />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-text">Role</span>
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
            className="focus-ring w-full rounded-xl border border-border px-4 py-3"
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
          />
          Aktif
        </label>
      </div>
      <div className="flex gap-3">
        <button
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
          disabled={mutation.isPending}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/users")}
          className="rounded-xl border border-border px-6 py-3 font-semibold text-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-text">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        className="focus-ring w-full rounded-xl border border-border px-4 py-3"
      />
    </label>
  );
}
