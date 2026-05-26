# Notification/Admin modülleri — Type duplikasyon raporu

## notification_inapp

### Duplikasyon: `Notification` / `RawNotification`
- **Canonical kaynak:** `modules/notification_inapp/notification_inapp.types.ts:3-12` — `Notification` (Zod schema'dan türetilmiş)
  - Alanlar: `notificationId`, `title`, `message`, `path?`, `isRead`, `createdAt`
- **Duplike yerler:**
  - `modules_next/notification_inapp/hooks/use-notifications.hook.ts:6-13` — `interface RawNotification` (~98% match)
- **Önerilen unify:**
  ```ts
  import type { Notification } from '@/modules/notification_inapp/notification_inapp.types';
  // 'RawNotification' adını kaldır, doğrudan Notification kullan
  ```
- **Risk:** **Düşük** — sadece type rename, runtime davranışı yok.

---

## setting (kısmi duplikasyon — DİKKAT: farklı şemalar)

### Duplikasyon: `BrandingData` vs `Branding`
- **Yerler:**
  - `app/tenant/[tenantId]/admin/(tenant-scope)/settings/page.tsx:33` — `BrandingData` (10 alan: `brandLogoLight`, `brandLogoDark`, `customCss`, `customJs`, ...)
  - `app/tenant/[tenantId]/admin/(tenant-scope)/settings/branding/page.tsx:13` — `Branding` (9 alan: `companyName`, `supportEmail`, `supportUrl`, `logoUrl`, `primaryColor`, `accentColor`, ...)
- **Örtüşme:** ~40-50% (farklı endpoint'lere çağrı yapıyorlar)
- **Önerilen unify:** **YAPMA** — şemalar farklı; iki ayrı API endpoint var (`/settings` vs `/settings/branding`). Tip ayrımı kasıtlı.
- **Risk:** **Yüksek** — yanlış unify breaking change yapar. Sadece monitor.

---

## ai

### ✅ Temiz (local component state)
- `app/.../ai/page.tsx:29-31` — `ModelInfo`, `ProviderInfo`, `UsageEntry`
- Bunlar API response'undan **transform edilmiş** component state'leri; backend entity karşılığı yok.
- İsteğe bağlı iyileştirme: `modules_next/ai/ai.types.ts` altında export edilebilir, ama gerekli değil.

---

## audit_log

### ✅ Temiz
- `modules/audit_log/entities/audit_log.entity.ts` (DB) + `modules/audit_log/audit_log.types.ts` (Zod) ayrımı doğru pattern.
- Duplikasyon yok.

---

## notification_log

### ✅ Temiz
- `modules/notification_log/notification_log.service.ts:9-22` — `NotificationLogOpts` ve `NotificationLogQuery` domain-operation DTO'ları (entity'den ayrı olması doğru).
- Duplikasyon yok.

---

## notification_mail, notification_sms, notification_push

### ✅ Temiz
- Channel-specific payload tipleri kanal başına ayrı kalmalı (kasıtlı).
- Duplikasyon tespit edilmedi.

---

## observability

### ✅ Temiz
- Minimal implementasyon; type duplikasyonu yok.

---

## Özet

| Modül | Duplikasyon | Önem | Eylem |
|-------|-------------|------|-------|
| **notification_inapp** | RawNotification | Düşük | hook'ta canonical import |
| **setting** | BrandingData vs Branding | DİKKAT | Unify **YAPMA**; farklı endpoint'ler |
| **ai** | — | — | ✅ (local state) |
| **audit_log** | — | — | ✅ |
| **notification_log** | — | — | ✅ |
| **notification_mail/sms/push** | — | — | ✅ |
| **observability** | — | — | ✅ |

**Toplam:** 1 unify edilebilir (notification_inapp), 1 unify yapılmamalı (setting branding).

### Sonuç
Bu grup genel olarak temiz. Tek konkret iş: `RawNotification → Notification` rename'i.

---

*Scope: `notification_inapp`, `notification_mail`, `notification_sms`, `notification_push`, `notification_log`, `audit_log`, `observability`, `setting`, `ai`*
