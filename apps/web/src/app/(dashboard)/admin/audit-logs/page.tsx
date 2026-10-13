"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, HeartHandshake, LogIn, Settings, UserCog, Users, type LucideIcon } from "lucide-react";
import { adminApi } from "@/lib/api/admin.api";
import { formatDateTime, fromNow } from "@/lib/locale";
import type { AuditCategory, AuditLogEntry } from "@/types";

const PAGE_SIZE = 50;

const categoryMeta: Record<AuditCategory, { label: string; icon: LucideIcon; tone: string }> = {
  CARE: { label: "Care", icon: HeartHandshake, tone: "bg-green-100 text-green-700" },
  PATIENT: { label: "Patient Record", icon: Users, tone: "bg-blue-100 text-blue-700" },
  DOCUMENT: { label: "Document", icon: FileText, tone: "bg-amber-100 text-amber-700" },
  USER: { label: "Staff", icon: UserCog, tone: "bg-purple-100 text-purple-700" },
  LOGIN: { label: "Login/Logout", icon: LogIn, tone: "bg-slate-100 text-slate-600" },
  SYSTEM: { label: "Settings", icon: Settings, tone: "bg-slate-100 text-slate-600" }
};

const roleLabels = { ADMIN: "Administrator", EMPLOYEE: "Employee" } as const;

function LogRow({ log }: { log: AuditLogEntry }) {
  const meta = categoryMeta[log.category];
  const Icon = meta.icon;
  const failed = log.action === "USER_LOGIN_FAILED" || log.action === "TOKEN_REUSE_DETECTED";

  return (
    <li className="flex gap-3 px-4 py-3 hover:bg-surface">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-relaxed ${failed ? "text-danger" : "text-text"}`}>
          {log.isUrgent ? <span className="mr-2 rounded bg-danger px-1.5 py-0.5 text-xs font-bold text-white">URGENT</span> : null}
          {log.description}
        </p>
        <p className="mt-1 text-xs text-muted">
          {formatDateTime(log.performedAt)}
          {" · "}
          {fromNow(log.performedAt)}
          {log.actorRole ? ` · ${roleLabels[log.actorRole]}` : ""}
          {" · "}
          {meta.label}
        </p>
      </div>
    </li>
  );
}

export default function AuditLogsPage() {
  const [category, setCategory] = useState<AuditCategory | "">("");
  const [userId, setUserId] = useState("");
  const [importantOnly, setImportantOnly] = useState(true);
  const [page, setPage] = useState(1);

  const users = useQuery({ queryKey: ["admin", "users", "audit-filter"], queryFn: () => adminApi.users({ limit: 50 }) });
  const query = useQuery({
    queryKey: ["admin", "audit-logs", category, userId, importantOnly, page],
    queryFn: () =>
      adminApi.auditLogs({
        page,
        limit: PAGE_SIZE,
        category: category || undefined,
        userId: userId || undefined,
        importantOnly: importantOnly || undefined
      })
  });

  const resetPage = () => setPage(1);
  const logs = query.data ?? [];

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <div>
          <h2 className="text-xl font-bold text-text">Activity Logs</h2>
          <p className="text-sm text-muted">See who did what, and when, across the system.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as AuditCategory | "");
              resetPage();
            }}
          >
            <option value="">All actions</option>
            {(Object.keys(categoryMeta) as AuditCategory[]).map((key) => (
              <option key={key} value={key}>
                {categoryMeta[key].label}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            value={userId}
            onChange={(event) => {
              setUserId(event.target.value);
              resetPage();
            }}
          >
            <option value="">All staff</option>
            {users.data?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm font-semibold text-text">
            <input
              type="checkbox"
              checked={importantOnly}
              onChange={(event) => {
                setImportantOnly(event.target.checked);
                resetPage();
              }}
            />
            Only important actions (hide views and searches)
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {query.isLoading ? (
          <p className="p-6 text-center text-sm text-muted">Loading…</p>
        ) : query.isError ? (
          <p className="p-6 text-center text-sm text-danger">Could not load logs. Please refresh the page.</p>
        ) : logs.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">No records match these filters.</p>
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
          disabled={page === 1}
          onClick={() => setPage((value) => value - 1)}
        >
          ← Newer
        </button>
        <span className="text-sm text-muted">Page {page}</span>
        <button
          type="button"
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
          disabled={logs.length < PAGE_SIZE}
          onClick={() => setPage((value) => value + 1)}
        >
          Older →
        </button>
      </div>
    </div>
  );
}
