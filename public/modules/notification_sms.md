# SMS Notifications

- **id:** `notification_sms`
- **tier:** notifications
- **version:** 1.0.0
- **dir:** `modules/notification_sms/`
- **tags:** notifications, sms
- **icon:** `fas fa-message`
- **hasNextLayer:** false

Pluggable SMS sender (Twilio, Nexmo, Clickatell, NetGSM).

## Dependencies

- **requires:** `redis`, `env`, `setting`

## Services

- `notification_sms.service.ts`

## Setting keys

- `notification_sms.setting.keys.ts`

## README

# notification_sms module

Multi-provider SMS with BullMQ queue, region-based provider routing, phone number validation (libphonenumber), rate limiting, and country allowlists.

---

## Files

| File | Purpose |
|---|---|
| `notification_sms.service.ts` | Core: send, queue, provider selection, rate limiting |
| `notification_sms.setting.keys.ts` | Setting key constants |
| `providers/base.provider.ts` | Abstract base class |
| `providers/twilio.provider.ts` | Twilio |
| `providers/netgsm.provider.ts` | NetGSM (Turkey) |
| `providers/clickatell.provider.ts` | Clickatell |
| `providers/nexmo.provider.ts` | Vonage (Nexmo) |

---

## Sending an SMS

```typescript
import SMSService from '@/modules/notification_sms/notification_sms.service';

// Send immediately (validates phone number format)
await SMSService.send({
  to: '+905551234567',
  message: 'Your verification code is 123456',
});

// Queue for async processing
await SMSService.queue({
  to: '+905551234567',
  message: 'Your one-time password is 987654',
});
```

---

## Providers

Active provider is selected from settings key `SMS_PROVIDER`. Supported values: `twilio`, `netgsm`, `clickatell`, `nexmo`.

Region-based routing: configure different providers per country code via settings.

---

## Phone Number Validation

Uses Google's `libphonenumber` — all numbers must be in E.164 format (`+{countryCode}{number}`). Invalid numbers throw before sending.

---

## Rate Limiting

Per-phone-number rate limits are enforced via Redis. Limits are configurable via settings.

---

## Usage tracking & audit (NEW)

`_sendShortMessage` (the BullMQ worker target) now records every delivery attempt:

- On `result.success === true`:
  - `TenantUsageService.incrementSmsSends(tenantId, 1)` → updates the monthly `smsSends` quota counter.
  - `NotificationLogService.log(tenantId, 'sms', toE164, 'sent', { provider, providerMessageId })`.
- On provider error / `result.success === false`:
  - `NotificationLogService.log(tenantId, 'sms', toE164, 'failed', { provider, error })`.

Audit/usage failures are swallowed — SMS delivery is never blocked.
