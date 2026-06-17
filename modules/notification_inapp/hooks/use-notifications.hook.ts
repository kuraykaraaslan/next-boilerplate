'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import type { NotificationItem } from '@kuraykaraaslan/common/ui/notification-menu.component';
import type { Notification as InAppNotification } from '@kuraykaraaslan/notification_inapp/server/notification_inapp.types';

function formatTimestamp(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

function toItem(n: InAppNotification): NotificationItem {
  return {
    id: n.notificationId,
    title: n.title,
    description: n.message || undefined,
    timestamp: formatTimestamp(n.createdAt),
    read: n.isRead,
  };
}

export function useNotifications(apiBase: string) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<{ notifications: InAppNotification[] }>(`${apiBase}/notifications`);
      setItems((res.data.notifications ?? []).map(toItem));
    } catch {
      // silently ignore — user may not be authenticated yet
    }
  }, [apiBase]);

  const markAllRead = useCallback(async () => {
    try {
      await api.put(`${apiBase}/notifications/read-all`);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
  }, [apiBase]);

  // SSE stream for real-time incoming notifications
  useEffect(() => {
    fetch();

    const es = new EventSource(`${apiBase}/notifications/stream`, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const raw: InAppNotification = JSON.parse(e.data);
        setItems((prev) => [toItem(raw), ...prev].slice(0, 50));
      } catch { /* ignore malformed */ }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [apiBase, fetch]);

  return { items, markAllRead };
}
