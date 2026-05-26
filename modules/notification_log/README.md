# notification_log

Unified outbound notification audit log. One row per delivery attempt across all channels (`mail`, `sms`, `push`, `inapp`). The channel-specific notification services (`notification_mail`, `notification_sms`, ...) call into this module from their BullMQ worker completion/failure handlers.

## What it does

- Persists `NotificationLog` rows to the tenant DB with channel, recipient, provider, status, optional `providerMessageId` and `error`.
- Powers admin "outbound deliveries" dashboards and per-user delivery history.
- Pairs with `tenant_usage` counters (`emailSends`, `smsSends`) — counters answer "how many", logs answer "to whom, by which provider, succeeded?".

## API

```ts
import NotificationLogService from '@/modules/notification_log/notification_log.service';

await NotificationLogService.log(tenantId, 'mail', 'user@example.com', 'sent', {
  subject: 'Welcome',
  provider: 'smtp',
  providerMessageId: '<abc@host>',
});

await NotificationLogService.log(tenantId, 'sms', '+12025551234', 'failed', {
  provider: 'twilio',
  error: 'Twilio: invalid recipient',
});

const { logs, total } = await NotificationLogService.list(tenantId, {
  channel: 'mail',
  status: 'failed',
  limit: 50,
});
```

`log()` swallows errors — outbound notification flow is never blocked by audit-log unavailability.

## Entity

`NotificationLog` is registered in `modules/db/db.ts` (single DataSource).
