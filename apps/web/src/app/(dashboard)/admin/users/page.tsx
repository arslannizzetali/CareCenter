"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api/admin.api";
import { ApiClientError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth.store";
import { SimpleTable } from "@/components/data/simple-table";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [showDeleted, setShowDeleted] = useState(false);

  const query = useQuery({
    queryKey: ["admin", "users", showDeleted ? "deleted" : "active"],
    queryFn: () => (showDeleted ? adminApi.deletedUsers() : adminApi.users())
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      toast.success("Employee deleted");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not delete employee")
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => adminApi.restoreUser(id),
    onSuccess: () => {
      toast.success("Employee restored");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not restore employee")
  });

  const busy = deleteMutation.isPending || restoreMutation.isPending;

  function handleDelete(id: string, name: string): void {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteMutation.mutate(id);
    }
  }

  const rows =
    query.data?.map((user) => {
      const name = `${user.firstName} ${user.lastName}`;
      const roleLabel = user.role === "ADMIN" ? "Administrator" : "Employee";
      const statusLabel = user.isActive === false ? "Inactive" : "Active";

      const action = showDeleted ? (
        <button
          key={user.id}
          onClick={() => restoreMutation.mutate(user.id)}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-primary hover:bg-blue-50 disabled:opacity-60"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restore
        </button>
      ) : (
        <div key={user.id} className="flex items-center gap-3">
          <Link href={`/admin/users/${user.id}`} className="text-xs font-semibold text-primary">
            Edit
          </Link>
          {user.id === currentUserId ? (
            <span className="text-xs text-muted">—</span>
          ) : (
            <button
              onClick={() => handleDelete(user.id, name)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-semibold text-danger hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      );

      return [name, user.email, roleLabel, statusLabel, action];
    }) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-xl font-bold text-text">Employees</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowDeleted((value) => !value)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
              showDeleted ? "border-primary bg-blue-50 text-primary" : "border-border bg-white text-muted"
            }`}
          >
            {showDeleted ? "Active employees" : "Deleted"}
          </button>
          {!showDeleted ? (
            <Link href="/admin/users/new" className="rounded-xl bg-primary px-4 py-2 font-semibold text-white">
              New Employee
            </Link>
          ) : null}
        </div>
      </div>
      <SimpleTable headers={["Name", "Email", "Role", "Status", "Actions"]} rows={rows} />
      {!rows.length ? (
        <p className="rounded-2xl bg-surface p-6 text-center text-muted">
          {showDeleted ? "No deleted employees." : "No employees found."}
        </p>
      ) : null}
    </div>
  );
}
