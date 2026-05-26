# Auth/Integration modülleri — Type duplikasyon raporu

## webhook

### Duplikasyon: `WebhookEvent` union
- **Canonical kaynak:** `modules/webhook/webhook.enums.ts:11-44` — `WebhookEventEnum` (Zod) ve `type WebhookEvent = z.infer<...>`
- **Duplike yerler:**
  - `app/tenant/[tenantId]/admin/(tenant-scope)/webhooks/page.tsx:37-49` — aynı değerler hardcoded literal union
- **Önerilen unify:** `import type { WebhookEvent } from '@/modules/webhook/webhook.enums'`
- **Risk:** **Düşük** — saf enum union, %100 örtüşme.

### Duplikasyon: `Webhook` object tipi
- **Canonical kaynak:** `modules/webhook/entities/webhook.entity.ts:12-57`
- **Duplike yerler:**
  - `app/.../webhooks/page.tsx:67-76` — `type Webhook = { webhookId, name, description, url, events, isActive, createdAt, updatedAt }`
- **Not:** Local tip kasıtlı olarak `secret`, `previousSecret`, `previousSecretExpiresAt` alanlarını dışlıyor (security).
- **Önerilen unify:** `modules/webhook/webhook.types.ts` altında `SafeWebhookSchema` oluştur ve `type SafeWebhook = z.infer<...>` export et; page bunu import etsin.
- **Risk:** **Orta** — type henüz canonical değil; önce `modules/webhook/webhook.types.ts` yazılmalı.

### Duplikasyon: `WebhookDelivery` object
- **Canonical kaynak:** `modules/webhook/entities/webhook_delivery.entity.ts:12-67`
- **Duplike yerler:**
  - `app/.../webhooks/page.tsx:78-88` — `type Delivery` (~95% match)
- **Önerilen unify:** Entity'den direct import veya `webhook.types.ts`'te `SafeWebhookDelivery` export et.
- **Risk:** **Düşük** — alan örtüşümü çok yüksek.

---

## api_key

### Duplikasyon: `SafeApiKey`
- **Canonical kaynak:** `modules/api_key/entities/api_key.entity.ts:12-56` — `ApiKey`
- **Duplike yerler:**
  - `app/tenant/[tenantId]/admin/(tenant-scope)/api-keys/page.tsx:18-31` — `type SafeApiKey` (entity'nin `keyHash` hariç tüm alanları)
- **Önerilen unify:** `modules/api_key/api_key.types.ts` dosyası oluştur, `SafeApiKeySchema` ile `keyHash` omit eden Zod schema yaz, export et.
- **Risk:** **Düşük** — `Safe*` isimlendirmesi zaten convention'a uygun.

---

## auth_saml

### ✅ Temiz (kasıtlı ayrım)
- `modules/auth_saml/auth_saml.types.ts:24` — `SafeSamlConfig` zaten merkezi
- `modules_next/auth_saml/ui/SamlConfigForm.tsx:16-29` — `SamlConfigFormValues` **form-local** (intentional, sensitive alanları gizliyor)
- Unify YAPILMAMALI.

---

## auth

### ✅ Temiz (form-local state)
- `modules_next/auth/ui/LoginForm.tsx:9` — `LoginFormValues` (form-only)
- `modules_next/auth/ui/RegisterForm.tsx:9` — `FormValues` (form-only)
- Entity duplikasyonu yok; form state kasıtlı olarak local.

---

## auth_sso, auth_impersonation, e_signature, scim

### ✅ Temiz
- Admin route'larında duplike type bulunamadı.
- OAuth provider DTO'ları third-party'den gelen şekiller (Google/GitHub/...) — kendi tipleriyle kalmalı.

---

## Özet

| Modül | Duplikasyon | Risk | Eylem |
|-------|-------------|------|-------|
| **webhook** | WebhookEvent (1 yer) | Düşük | enums import |
| **webhook** | Webhook object | Orta | önce `webhook.types.ts` yaz |
| **webhook** | WebhookDelivery | Düşük | entity ya da Safe schema import |
| **api_key** | SafeApiKey | Düşük | önce `api_key.types.ts` yaz |
| **auth_saml** | — | — | ✅ (kasıtlı separation) |
| **auth** | — | — | ✅ (form-local) |
| **auth_sso/imp/e_sig/scim** | — | — | ✅ |

**Toplam:** 4 unify edilebilir duplikasyon (3'ü webhook'ta).
**Ön koşul:** `webhook.types.ts` ve `api_key.types.ts` dosyalarının yazılması — şu anda admin page'ler entity'den türetilmiş ad-hoc tip kullanıyor.

### Tahmini Çaba
- 2 yeni `*.types.ts` dosyası (Zod schema + Safe export)
- 2 admin page import refactor
- ~2-3 saatlik iş

---

*Scope: `auth`, `auth_sso`, `auth_saml`, `auth_impersonation`, `api_key`, `webhook`, `e_signature`, `scim`*
