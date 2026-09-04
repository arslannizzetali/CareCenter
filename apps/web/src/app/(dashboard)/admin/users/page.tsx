"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin.api";
import { SimpleTable } from "@/components/data/simple-table";

export default function AdminUsersPage() {
  const query = useQuery({
    queryKey: ["admin", "users"],
    queryFn: adminApi.users
  });

  const rows =
    query.data?.map((user) => [
      `${user.firstName} ${user.lastName}`,
      user.email,
      user.role === "ADMIN" ? "Yönetici" : "Çalışan",
      user.isActive === false ? "Pasif" : "Aktif"
    ]) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-xl font-bold text-text">Çalışanlar</h2>
        <Link href="/admin/users/new" className="rounded-xl bg-primary px-4 py-2 font-semibold text-white">
          Yeni Çalışan
        </Link>
      </div>
      <SimpleTable headers={["Ad Soyad", "E-posta", "Rol", "Durum"]} rows={rows} />
    </div>
  );
}
