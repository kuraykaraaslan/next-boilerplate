# notification_inapp module

Real-time in-app notifications using Redis pub/sub. Stores up to 50 notifications per user, tracks read/unread status, and streams updates via SSE. Auto-triggers push notifications.

---

## Files

| File | Purpose |
|---|---|
| `notification_inapp.service.ts` | Core: create, list, mark-read, Redis pub/sub |
| `notification_inapp.types.ts` | `Notification`, `NotificationPayload` |
| `notification_inapp.messages.ts` | Error/success message strings |
| `use-notifications.hook.ts` | React hook for client-side subscription via SSE |

---

## Notification Shape

```typescript
type Notification = {
  id: string;
  title: string;
  message: string;
  path?: string;     // link to navigate on click
  isRead: boolean;
  createdAt: string;
};
```

---

## Sending a Notification

```typescript
import NotificationInAppService from '@/modules/notification_inapp/notification_inapp.service';

await NotificationInAppService.send(userId, {
  title: 'Invitation accepted',
  message: 'John Doe joined your workspace.',
  path: `/tenant/${tenantId}/admin/members`,
});
```

---

## Client-Side Hook

```tsx
'use client';
import { useNotifications } from '@/modules/notification_inapp/use-notifications.hook';

function NotificationBell({ userId }: { userId: string }) {
  const { notifications, unreadCount, markRead } = useNotifications(userId);

  return (
    <button onClick={() => markRead(notifications[0].id)}>
      {unreadCount} unread
    </button>
  );
}
```

---

## Storage

- Redis list per user: `notifications:{userId}` — capped at 50 items, 7-day TTL
- Real-time delivery via Redis pub/sub channel `notifications:{userId}`
- SSE endpoint streams to connected clients

---

## API Routes

```
GET  /api/notifications/stream   — SSE stream
GET  /api/notifications          — list notifications
POST /api/notifications/read     — mark as read
```
