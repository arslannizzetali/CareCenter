"use client";

import { api, buildQuery } from "./client";
import type { AppNotification } from "@/types";

export interface NotificationListResult {
  items: AppNotification[];
  unreadCount: number;
}

export const notificationApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<NotificationListResult>(`/notifications${buildQuery(params)}`),
  unreadCount: () => api.get<{ unreadCount: number }>("/notifications/unread-count"),
  markRead: (id: string) => api.post<AppNotification>(`/notifications/${id}/read`),
  markAllRead: () => api.post<{ updated: number }>("/notifications/read-all"),
  scan: () => api.post<{ created: number }>("/notifications/scan"),
  remove: (id: string) => api.delete<void>(`/notifications/${id}`)
};
