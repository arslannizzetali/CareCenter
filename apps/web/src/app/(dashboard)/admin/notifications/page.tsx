"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarClock, Check, CheckCheck, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { notificationApi } from "@/lib/api/notification.api";
import { documentApi } from "@/lib/api/document.api";
import { formatDateTime } from "@/lib/locale";
import type { AppNotification } from "@/types";

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const query = useQuery({
    queryKey: ["notifications", "list", unreadOnly],
    queryFn: () => notificationApi.list({ limit: 100, unreadOnly: unreadOnly || undefined })
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["document-matrix"] });
    void queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      invalidate();
    },
    onError: () => toast.error("Operation failed")
  });

  const scan = useMutation({
    mutationFn: () => notificationApi.scan(),
    onSuccess: (result) => {
      toast.success(result.created ? `${result.created} new notifications created` : "No new notifications");
      invalidate();
    },
    onError: () => toast.error("Scan failed")
  });

  const items = query.data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-text">
          <Bell className="h-5 w-5" />
          Notifications
          {query.data?.unreadCount ? (
            <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">
              {query.data.unreadCount} unread
            </span>
          ) : null}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setUnreadOnly((value) => !value)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
              unreadOnly ? "border-primary bg-blue-50 text-primary" : "border-border bg-white text-muted"
            }`}
          >
            {unreadOnly ? "All" : "Unread only"}
          </button>
          <button
            onClick={() => scan.mutate()}
            disabled={scan.isPending}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${scan.isPending ? "animate-spin" : ""}`} />
            Scan now
          </button>
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || !query.data?.unreadCount}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} onChanged={invalidate} />
        ))}
        {!items.length ? (
          <p className="rounded-2xl bg-surface p-6 text-center text-muted">
            {unreadOnly ? "No unread notifications." : "No notifications."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function NotificationCard({
  notification,
  onChanged
}: {
  notification: AppNotification;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState("");

  const setExpiry = useMutation({
    mutationFn: (value: string) =>
      documentApi.updateMeta(notification.documentId as string, { expiresAt: value }),
    onSuccess: () => {
      toast.success("New expiry date saved");
      setEditing(false);
      onChanged();
    },
    onError: () => toast.error("Could not save date")
  });

  const dismiss = useMutation({
    mutationFn: () => notificationApi.remove(notification.id),
    onSuccess: () => {
      toast.success("Notification dismissed");
      onChanged();
    },
    onError: () => toast.error("Could not dismiss")
  });

  const canReschedule = notification.type === "DOCUMENT_EXPIRING" && Boolean(notification.documentId);

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm ${
        notification.isRead ? "border-border bg-white" : "border-primary/40 bg-blue-50/40"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-text">{notification.title}</p>
          <p className="mt-1 text-sm text-muted">{notification.body}</p>
          <p className="mt-2 text-xs text-muted">{formatDateTime(notification.createdAt)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {notification.patientId ? (
            <Link
              href={`/patients/${notification.patientId}`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary"
            >
              Open patient
            </Link>
          ) : null}
          {canReschedule ? (
            <button
              onClick={() => setEditing((value) => !value)}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary"
            >
              <CalendarClock className="h-4 w-4" />
              New date
            </button>
          ) : null}
          <button
            onClick={() => dismiss.mutate()}
            disabled={dismiss.isPending}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Tamam
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-surface p-3">
          <span className="text-xs font-semibold text-muted">New expiry date:</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="focus-ring rounded-lg border border-border px-2 py-1.5 text-sm"
          />
          <button
            onClick={() => date && setExpiry.mutate(date)}
            disabled={!date || setExpiry.isPending}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold text-muted"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
          <span className="text-xs text-muted">If the date is more than a month away, the notification clears automatically.</span>
        </div>
      ) : null}
    </article>
  );
}
