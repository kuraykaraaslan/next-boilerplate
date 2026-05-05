# notification_push module

Web Push notifications using the Web Push API with VAPID keys. Manages browser subscriptions and sends push messages to users or roles.

---

## Files

| File | Purpose |
|---|---|
| `notification_push.service.ts` | Core: subscribe, unsubscribe, send, cleanup expired |
| `notification_push.messages.ts` | Error/success message strings |
| `entities/push_subscription.entity.ts` | TypeORM entity for storing subscriptions |

---

## Push Payload

```typescript
type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  url?: string;   // navigate on click
};
```

---

## Sending a Push

```typescript
import PushService from '@/modules/notification_push/notification_push.service';

// To a specific user (all their subscribed devices)
await PushService.sendToUser(userId, {
  title: 'New message',
  body: 'You have a new message from Alice.',
  url: '/messages',
});

// To all members with a given role
await PushService.sendToRole(tenantId, 'ADMIN', {
  title: 'Action required',
  body: 'A new member needs approval.',
});
```

---

## Browser-Side Subscription

On the client, subscribe using the standard `PushManager` API and POST the `PushSubscription` object to:

```
POST /api/notifications/push/subscribe
DELETE /api/notifications/push/unsubscribe
```

---

## VAPID Keys

Set in system settings under `PUSH_VAPID_PUBLIC_KEY` and `PUSH_VAPID_PRIVATE_KEY`. Generate with:

```bash
npx web-push generate-vapid-keys
```

Expired subscriptions are cleaned up automatically on send failure (410 Gone).
