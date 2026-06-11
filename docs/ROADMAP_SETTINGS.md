# Modül Bazlı Ayarlar Yol Haritası (Settings-Per-Module)

Her admin modülüne, kendi sayfasından erişilen **kendi ayar sayfası** kazandırma çalışması.
Modülün ana admin sayfasındaki `PageHeader`'a bir **faGear** eklenir (ayrı bir buton/`action` olarak —
`PageHeader` bileşeni değiştirilmez); tıklanınca o modülün `…/settings` alt sayfası açılır. Ayar sayfaları
ortak "settings teması" (Card + Input/Toggle/Select) ile kurulur ve modülün **olası ayarları** ile
**mevcut değerlerini** gösterir.

İki aşamalı: **önce UI, sonra kod.**

---

## Mimari Özet

- **faGear → `actions`**: gear, her sayfanın mevcut `PageHeader` `actions` dizisine ilk eleman olarak
  (`{ label: <FontAwesomeIcon icon={faGear} />, href: '…/settings', variant: 'ghost' }`) eklenir.
  Ortak `PageHeader` bileşeni **değiştirilmedi**.
- **Ortak scaffold**: `modules_next/setting/ui/ModuleSettingsPage.tsx` — data-driven; `SettingFieldDef[]`
  alır, alanları `group`'a göre Card'lara böler, doğru kontrolü render eder.
- **Alan metası**: `modules_next/setting/setting-fields.types.ts` (`SettingFieldDef`) + modül başına
  `modules/<m>/<m>.settings.fields.ts` (saf veri; `'use client'` sayfalara import güvenli).
- **Backend**: yeni route YOK. Okuma/yazma mevcut `GET/PUT /tenant/[tenantId]/api/admin-settings`
  (ADMIN korumalı) üzerinden, `SettingService` (`settings` key-value tablosu) ile. Scaffold yalnızca
  **kendi modülünün key'lerini** okur ve **kısmi patch** yollar (başka modülün key'lerine dokunmaz).
- **Faz 2**: aday key'ler `modules/<m>/<m>.setting.keys.ts`'e (zod enum) terfi; ilgili servis sabit
  yerine `SettingService`'ten okur; `npm run registry:snapshot` ile `settingKeys` otomatik dolar.

---

## Tier Sınıflandırması

- **T1 — Kendi sayfası olan, per-tenant kendi key'leri olan modüller → gear + bağımsız `…/settings` sayfası.**
  Bu PR'da kuruldu.
- **T2 — Eskiden merkezi hub'da olan modüller → artık her biri kendi sayfasına TAŞINDI.** Hub
  (`/admin/settings`) bir **launcher**'a (link dizinine) dönüştürüldü; editörler tek tek per-module
  sayfalara çıkarıldı, böylece her key tek bir yüzeyden düzenlenir (çakışma yok). Bkz. "Güncelleme —
  Hub launcher'a çevrildi".
- **T3 — Sistem/ROOT-scoped ayarlar** (per-tenant değil, ROOT_TENANT_ID üzerinde). Per-tenant scaffold uygun
  değil; root-scoped bir yüzey gerektirir → ertelendi.
- **T4 — Admin sayfası olmayan / yalnız `env:*` / tenant'ın düzenleyemeyeceği infra modülleri** → gear yok, N/A.

---

## Güncelleme — Hub launcher'a çevrildi

Merkezi `/admin/settings` hub'ı bir **launcher**'a dönüştürüldü (Organization / Integrations /
Access & Security / Modules grupları + Danger Zone). Hub'daki editörler şu per-module sayfalara taşındı.
Paylaşılan altyapı: `SettingsPanelHost` (load + partial-patch save), `settings-kit`, `TenantSettingsPanels`
(General + Billing), ve `PlatformSettingsTabs`'ten artık `export` edilen panel'ler.

| Yeni sayfa | Panel | Modül | Erişim |
| --- | --- | --- | --- |
| `settings/general` | GeneralTab | tenant | launcher |
| `settings/billing` | BillingTab | payment | launcher |
| `settings/branding` | (mevcut bespoke) | tenant_branding | launcher |
| `settings/email` | PlatformEmailTab | notification_mail | launcher |
| `settings/sms` | PlatformSmsTab | notification_sms | launcher |
| `settings/storage` | PlatformStorageTab | storage | launcher |
| `settings/security` | PlatformSecurityTab | user_security | launcher |
| `settings/auth` | PlatformAuthTab | auth / auth_sso | launcher |
| `settings/scim` | PlatformScimTab | scim | launcher |
| `settings/notifications` | PlatformNotificationsTab | notification_push | launcher |
| `settings/e-signature` | TenantESignatureSettingsPanel | e_signature | launcher |
| `payments/settings` | PlatformPaymentTab | payment | **gear** + launcher |
| `ai/settings` | PlatformAiTab | ai | **gear** + launcher |

Ertelenenler: `invoice` (büyük; kendi `InvoiceTemplateSettings`'i ile ayrı ele alınacak), `tenant_subscription`
(ROOT-scoped), `tenant_session` (güvenlik politikası), `auth_saml` (SAML sayfası zaten kendi yönetir).

## İzleme Tablosu (45 modül)

`#keys` = modülün olası ayar sayısı (env:* hariç kullanılabilir aday sayısı). P1/P2: ☑ tamam, ☐ bekliyor, — uygulanmaz. *(Aşağıdaki tablo ilk Faz-1 anlık görüntüsüdür; T2 satırları artık yukarıdaki launcher sayfalarına taşınmıştır.)*

| Modül | Scope | Admin sayfası | #keys | Tier | Settings sayfası | P1 | P2 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tenant_member | tenant | members | 1 (`defaultMemberRole`) | T1 | `members/settings` | ☑ | ☐ |
| tenant_domain | tenant | domains | 2 | T1 | `domains/settings` | ☑ | ☐ |
| webhook | tenant | webhooks | 4 | T1 | `webhooks/settings` | ☑ | ☐ |
| tenant_invitation | tenant | invitations | 1 | T1 | `invitations/settings` | ☑ | ☐ |
| api_key | tenant | api-keys | 1 | T1 | `api-keys/settings` | ☑ | ☐ |
| payment | tenant | payments | 43 | T2 | hub → Integrations → Payment | — | — |
| ai | tenant | ai | 16 | T2 | hub → Integrations → AI | — | — |
| invoice | tenant | invoices | 46 | T2 | hub → Integrations → Invoicing | — | — |
| storage | tenant | (hub) | 8 | T2 | hub → Integrations → Storage | — | — |
| notification_mail | tenant | (hub) | 28 | T2 | hub → Integrations → Email | — | — |
| notification_sms | tenant | (hub) | 12 | T2 | hub → Integrations → SMS | — | — |
| auth | tenant | (hub) | 51 | T2 | hub → General + Integrations → Auth | — | — |
| auth_sso | tenant | (hub) | 27 | T2 | hub → Integrations → SSO | — | — |
| user_security | tenant | (hub) | 14 | T2 | hub → Integrations → Security | — | — |
| e_signature | tenant | (hub) | 16 | T2 | hub → E-Signature sekmesi | — | — |
| tenant | tenant | (hub) | 24 | T2 | hub → General | — | — |
| tenant_branding | tenant | settings/branding | 10 | T2 | hub → Branding (bespoke) | — | — |
| tenant_session | tenant | (hub) | 12 | T2 | hub → Security policy | — | — |
| scim | tenant | (hub) | 3 | T2 | hub sekmesi | — | — |
| auth_saml | tenant | saml | 4 (env) | T2 | SAML sayfası kendisi yönetir | — | — |
| tenant_subscription | sistem/ROOT | plans, subscription | 5 | T3 | ertelendi (root-scoped); `defaultPlanId` özel UI | ☐ | ☐ |
| coupon | tenant | coupons | 1 | T4 | N/A — key Payments'a ait | — | — |
| api_doc | tenant | api-docs | 0 | T4 | N/A — key yok | — | — |
| audit_log | tenant | (yok) | 3 | T4 | N/A | — | — |
| tenant_usage | tenant | (yok) | 4 | T4 | N/A | — | — |
| tenant_export | tenant | (yok) | 1 | T4 | N/A | — | — |
| notification_inapp | tenant | (yok) | 2 | T4 | N/A | — | — |
| notification_log | tenant | (yok) | 2 | T4 | N/A | — | — |
| notification_push | tenant | (yok) | 4 (env) | T4 | N/A | — | — |
| limiter | infra | (yok) | 5 | T4 | N/A | — | — |
| redis | infra | (yok) | 4 (env) | T4 | N/A | — | — |
| redis_idempotency | infra | (yok) | 1 | T4 | N/A | — | — |
| observability | infra | (yok) | 7 (env) | T4 | N/A | — | — |
| logger | infra | (yok) | 1 (env) | T4 | N/A | — | — |
| db | infra | (yok) | 2 (env) | T4 | N/A | — | — |
| env | infra | (yok) | 1 (env) | T4 | N/A | — | — |
| common | infra | (yok) | 0 | T4 | N/A | — | — |
| setting | infra | (hub altyapısı) | 1 | T4 | N/A | — | — |
| auth_impersonation | tenant | (yok) | 1 | T4 | N/A | — | — |
| user | sysadmin | users | 2 | T4 | N/A (sysadmin liste) | — | — |
| user_profile | tenant | me | 2 | T4 | N/A (self-service) | — | — |
| user_preferences | tenant | (yok) | 2 | T4 | N/A | — | — |
| user_session | tenant | (yok) | 9 (env) | T4 | N/A | — | — |
| user_agent | tenant | (yok) | 2 | T4 | N/A | — | — |
| user_social_account | tenant | (yok) | 2 | T4 | N/A | — | — |

---

## Faz 1 — UI (bu PR)

Ortak altyapı + 5 T1 modülü uçtan uca:

- `modules_next/setting/setting-fields.types.ts` — `SettingFieldDef` tipi.
- `modules_next/setting/ui/ModuleSettingsPage.tsx` — ortak data-driven settings sayfası.
- Her T1 modülü için:
  1. `modules/<m>/<m>.settings.fields.ts` — modülün olası ayarları küratörlükle
     `SettingFieldDef[]`'e çevrildi (env:* ve "external/declared elsewhere" satırlar atlandı).
  2. `<page>/page.tsx`'in `PageHeader` `actions`'ına gear eklendi (`PageHeader` bileşeni değişmedi).
  3. `<page>/settings/page.tsx` — `ModuleSettingsPage`'i render eden ince istemci sayfası.
- Okuma/yazma: mevcut `/api/admin-settings`. Değerler kaydedilir ve geri okunur; davranışa etkisi Faz 2'de.

## Faz 2 — Kod (sonraki)

Modül başına:
- Aday key'leri `modules/<m>/<m>.setting.keys.ts`'e (zod enum + `*_KEYS`) terfi et.
- Servisteki sabitleri `SettingService` okumasıyla + güvenli varsayılan + tip dönüşümü ile değiştir:
  - `tenant_member` davet akışı: yeni üye/davet kabul edilince rol, `defaultMemberRole` ayarından okunur
    (yoksa `USER`). Davet formundaki başlangıç rolü de bundan beslenir.
  - `webhook.service.ts`: `webhookMaxAttempts` / `webhookRetryDelaysMs` / `webhookRequestTimeoutMs`
    `Number(...)` / split + varsayılan ile okunur.
  - `tenant_domain.service.ts`: zaten `getByKey(tenantId, 'maxDomains'/'maxSubdomains')` okuyor — yalnız
    key dosyasının terfisi ve dökümantasyon gerekir.
- `npm run registry:snapshot` → `settingKeys` otomatik dolar (snapshot script'i `*.setting.keys.ts`'i zaten
  bucket'lıyor; **script değişikliği yok**).
- İlgili `modules/<m>/README.md` güncellenir.

---

## Notlar / Riskler

- **Düz key uzayı (çakışma):** `settings` tablosu tenant başına düz bir key uzayı; bazı key'ler modüller
  arası paylaşılır (`currency`, `taxId`, `invoicePrefix`, `stripe*`). Her paylaşılan key için **tek sahip
  yüzey** atanmalı; ikinci bir modül sayfasında aynı key tekrar düzenlenmemeli. T2 modüllerinin hub'da
  kalmasının nedeni budur.
- **Hub çakışması:** `payment`, `ai`, `invoice`, `storage`, `notification_*`, `auth*`, `user_security`,
  `e_signature`, `tenant`, `tenant_branding`, `tenant_session` ayarları zaten hub'da düzenlenebiliyor;
  bunlara ayrı sayfa açmak çift düzenleme yüzeyi yaratırdı → açılmadı.
- **ROOT-scoped:** `tenant_subscription` key'leri `ROOT_TENANT_ID` üzerinde saklanıyor; per-tenant scaffold
  yanlış tenant'a yazardı → ertelendi. `defaultPlanId` ayrıca özel `PUT /api/plans/default` akışına sahip.
- **Sırlar (secrets):** generic `/api/admin-settings` maskelemez. Gerçekten hassas key'ler (e-imza, JWT,
  reCAPTCHA server key) bespoke maskeli servislerde kalmalı; scaffold'a verilmemeli. Scaffold yine de
  `***SET***` mask-skip koruması içerir.
- **Yetki:** sayfa seviyesinde guard yok; `/api/admin-settings` zaten `ADMIN` ister. ADMIN olmayan kullanıcı
  sayfayı görür ama kaydet/oku hata verir (mevcut hub davranışıyla aynı).
- **env-only key'ler:** `env:*` satırları deployment konfigüdür, tenant'ın düzenleyeceği DB ayarı değildir →
  alan dosyalarına alınmaz.
