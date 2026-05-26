# CODEQ — Type Duplikasyon Master Özet

**Tarih:** 2026-05-26
**Kapsam:** ~29 modül, app/ route'ları + modules_next/ + modules/
**Yöntem:** 5 paralel araştırma agent'ı (commerce, identity, tenant, auth, notification)

---

## TL;DR

| Grup | Unify Edilebilir | Yapılmamalı (ViewModel/Form/Kasıtlı) | Temiz |
|------|------------------|--------------------------------------|-------|
| Commerce/Content | 7 | 1 (CreateForm) | 4 modül |
| Identity/User | 5 | — | 3 modül |
| Tenant | 23 (16 enum + 7 object) | — | 5 modül |
| Auth/Integration | 4 | 2 (form-local) | 4 modül |
| Notification/Admin | 1 | 1 (Branding farklı endpoint) | 7 modül |
| **TOPLAM** | **~40 duplikasyon** | 4 | **23 modül temiz** |

En kirli iki nokta:
1. **Tenant enum'ları** — `MemberRole`, `TenantStatus`, `MemberStatus` toplam **13 ayrı dosyada** inline literal union olarak yeniden tanımlanmış. Canonical `modules/tenant_*/<x>.enums.ts` zaten mevcut.
2. **Webhook tipleri** — `Webhook`, `WebhookDelivery`, `WebhookEvent` admin page içinde ad-hoc tanımlanmış. Canonical `webhook.types.ts` henüz yok; önce o dosya yazılmalı.

---

## Faz Planı (Önerilen Sıralama)

### Faz 1 — Saf enum import refactor (en yüksek getiri, en düşük risk)
Bu faz sadece **literal union'ları** canonical enum'larla değiştiriyor. Davranış değişmiyor.

- `MemberRole` (6 yer) → `TenantMemberRole`
- `TenantStatus` (4 yer) → `TenantStatus` from `tenant.enums`
- `MemberStatus` (3 yer) → `TenantMemberStatus`
- `DomainStatus` (2 yer) → `DomainStatus` (sysadmin'de `DNS_FAILED` eksikliğine dikkat)
- `SslStatus` (1 yer) → `SslStatus`
- `InvitationStatus` (1 yer) → `TenantInvitationStatus`
- `UserRole` / `UserStatus` (3 yer) → `user.enums`
- `WebhookEvent` (1 yer) → `webhook.enums`
- `CouponStatus`, `DiscountType` (1+1 yer) → `coupon.enums`

**Tahmini:** 20+ dosya, ~1-1.5 saat. Tüm değişiklikler `import type` ekleme + local tip silme.

### Faz 2 — Object tip unify (Pick<SafeX, '...'>)
Entity tipinin alt kümesi olan display/listing tiplerini canonical `Safe*` schema'lardan türet.

- `dynamic_page` → `BlockDef`, `DynamicPage`
- `payment` → `Payment` list view
- `invoice` → `InvoiceRow`
- `coupon` → `Coupon` (CreateForm **local kalsın**)
- `user` → `SafeUser` reuse
- `user_preferences` → `UserPreferencesValues` direkt alias
- `user_security` → `StoredPasskey`
- `user_profile` → `UserProfileValues`
- `tenant_member` → `SafeTenantMember`
- `tenant_invitation` → `SafeTenantInvitation`
- `tenant_domain` → `SafeTenantDomain` (+ subset için Pick)
- `notification_inapp` hook → `Notification`

**Tahmini:** ~15 dosya, ~2 saat.

### Faz 3 — Eksik canonical type dosyalarını yaz
Bazı modüller için `Safe*Schema` yok. Önce yazılması gerekiyor:

- `modules/webhook/webhook.types.ts` — `SafeWebhookSchema`, `SafeWebhookDeliverySchema`
- `modules/api_key/api_key.types.ts` — `SafeApiKeySchema` (keyHash omit)

Sonra Faz 2 pattern'i ile import'lar yapılır.

**Tahmini:** ~1 saat.

---

## Unify YAPILMAMALI olanlar

1. **Form state tipleri** (`LoginFormValues`, `RegisterForm`, `SamlConfigFormValues`, `CouponCreateForm`) — entity'den kasıtlı olarak ayrı.
2. **Settings vs Branding tipleri** — iki farklı API endpoint'i, şemalar gerçekten farklı.
3. **OAuth provider DTO'ları** — third-party şekiller, kendi tipleriyle kalmalı.
4. **AI component state** (`ModelInfo`, `ProviderInfo`, `UsageEntry`) — backend entity karşılığı yok, UI-only.
5. **Notification channel payload'ları** — kanal başına farklı şekil mantıklı.

---

## Convention Önerisi

Repo'ya bir kural eklenebilir (`AGENTS.md` veya `modules/README.md` içine):

> **Type tanım kuralları**
> 1. Entity tipleri her zaman `modules/<mod>/entities/<x>.entity.ts` içinde, TypeORM @Entity decorator'ı ile.
> 2. Client-safe varyantlar `modules/<mod>/<mod>.types.ts` içinde Zod schema + `z.infer<>` ile.
> 3. Enum union'ları `modules/<mod>/<mod>.enums.ts` içinde Zod enum + `z.infer<>` ile.
> 4. `app/**/*.tsx` ve `modules_next/**/*.tsx` içinde **inline `type X = {...}` ile entity yeniden tanımlanmaz.** Her zaman canonical kaynaktan import edilir. Subset gerekiyorsa `Pick<SafeX, '...' | '...'>`.
> 5. **İstisna:** Form state, UI ViewModel, third-party DTO ve component prop tipleri local kalabilir.

---

## Rapor Dosyaları

- [01_commerce_content.md](01_commerce_content.md) — dynamic_page, seo, media_gallery, store, payment*, invoice, coupon
- [02_identity_user.md](02_identity_user.md) — user, user_profile, user_security, user_preferences, user_session, user_social_account, user_agent
- [03_tenant.md](03_tenant.md) — tenant, tenant_member, tenant_invitation, tenant_domain, tenant_session, tenant_subscription, tenant_branding, tenant_export, tenant_usage
- [04_auth_integration.md](04_auth_integration.md) — auth, auth_sso, auth_saml, auth_impersonation, api_key, webhook, e_signature, scim
- [05_notification_admin.md](05_notification_admin.md) — notification_*, audit_log, observability, setting, ai
