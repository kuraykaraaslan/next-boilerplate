# modules

Framework-agnostic iş mantığı katmanı. Next.js, Express veya herhangi bir runtime tarafından kullanılabilir.

## Kural

Bu klasör altındaki hiçbir dosya aşağıdakileri import edemez:

- `next/*` (next/server, next/navigation, next/headers, ...)
- `react` veya `react-dom`
- Tarayıcı API'ları (`window`, `document`, ...)

Bu tür bağımlılıklar `modules_next/` altına taşınır.

## Klasör Yapısı

Her modül kendi içinde self-contained:

```
modules/
├── <module_adı>/
│   ├── <module>.service.ts       # İş mantığı
│   ├── <module>.service.test.ts  # Servis testleri
│   ├── <module>.dto.ts           # Zod şemaları (input validasyonu)
│   ├── <module>.dto.test.ts      # DTO testleri
│   ├── <module>.types.ts         # TypeScript tipleri
│   ├── <module>.enums.ts         # Enum tanımları
│   ├── <module>.messages.ts      # Hata / başarı mesajları
│   ├── <module>.setting.keys.ts  # Setting anahtarları (varsa)
│   ├── entities/                 # TypeORM entity sınıfları
│   └── README.md                 # Modül dokümantasyonu
│
├── module.types.ts               # Modül sistemi JSON tipleri (ModuleJson, MenuItemJson, ...)
└── module.schema.json            # module.json doğrulama şeması
```

## Modüller

| Modül | Açıklama |
|---|---|
| `ai` | AI provider entegrasyonları (OpenAI, Anthropic, Google) |
| `api_doc` | API dokümantasyonu |
| `api_key` | API key yönetimi |
| `audit_log` | Sistem ve tenant audit logları |
| `auth` | Kimlik doğrulama (login, register, OTP, TOTP) |
| `auth_impersonation` | Admin kullanıcı taklit etme |
| `auth_saml` | SAML SSO entegrasyonu |
| `auth_sso` | OAuth SSO (Google, GitHub, vs.) |
| `coupon` | Kupon ve indirim yönetimi |
| `notification_inapp` | Uygulama içi bildirimler |
| `notification_mail` | E-posta bildirimleri (BullMQ queue) |
| `notification_push` | Web push bildirimleri |
| `notification_sms` | SMS bildirimleri |
| `payment` | Ödeme işlemleri |
| `setting` | Sistem geneli ayarlar |
| `storage` | Dosya yükleme (S3 uyumlu) |
| `tenant` | Tenant yönetimi |
| `tenant_branding` | Tenant marka ayarları |
| `tenant_domain` | Tenant domain yönetimi |
| `tenant_export` | Tenant veri dışa aktarma |
| `tenant_invitation` | Tenant davet sistemi |
| `tenant_member` | Tenant üyelik yönetimi |
| `tenant_session` | Tenant oturum yönetimi |
| `tenant_setting` | Tenant başına ayarlar |
| `tenant_subscription` | Abonelik planları ve özellik erişimi |
| `tenant_usage` | Tenant kullanım metrikleri |
| `user` | Kullanıcı yönetimi |
| `user_agent` | Kullanıcı cihaz bilgisi |
| `user_preferences` | Kullanıcı tercihleri (tema, dil, zaman dilimi) |
| `user_profile` | Kullanıcı profil bilgileri |
| `user_security` | Güvenlik ayarları, passkey, hesap kilitleme |
| `user_session` | JWT oturum yönetimi |
| `user_social_account` | Sosyal hesap bağlantıları |
| `webhook` | Outgoing webhook sistemi |

## Bağımlılık Yönü

```
app/  →  modules_next/  →  modules/
                  ↑
            express-app/
```

`modules/` her zaman bağımlılık zincirinin en altındadır — kendisi hiçbir framework katmanına bağımlı değildir.
