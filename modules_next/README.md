# modules_next

Next.js'e özgü katman. `modules/` içindeki framework-agnostic iş mantığının Next.js bağımlılıklarını barındıran uzantısı.

## Kural

`modules/` altında hiçbir dosya `next/*`, `react` veya tarayıcı API'larına import içermez. Bu tür bağımlılıklar buraya taşınır.

## Klasör Yapısı

```
modules_next/
├── common/
│   ├── ui/                        # Modüle özgü olmayan paylaşılan React bileşenleri
│   │   ├── layout/                # AppShell, AdminShell, AppSidebar, AppTopBar
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   └── ...
│   └── module.types.ts            # ComponentType kullanan runtime tipleri (SettingsTab, Route, Widget, LoadedModule, ModuleRegistry)
│
├── <module_adı>/
│   ├── ui/                        # O modüle ait React bileşenleri
│   │   └── module.component.tsx
│   ├── hooks/                     # O modüle ait React hook'ları
│   │   └── use-something.hook.ts
│   └── <module_adı>.service.next.ts   # NextRequest/NextResponse kullanan servis uzantısı
│
├── audit_log/
│   ├── audit_log.service.next.ts  # AuditLogService extend eder, extractRequestContext ekler
│   └── ui/
├── tenant_session/
│   └── tenant_session.service.next.ts
├── user_session/
│   └── user_session.service.next.ts
├── notification_inapp/
│   └── hooks/
│       └── use-notifications.hook.ts
└── tenant_subscription/
    └── hooks/
        ├── use-feature-access.ts
        └── use-grace-period.ts
```

## İçerik Türleri

| Tür | Nereye | Örnek |
|---|---|---|
| Next.js servis uzantısı | `modules_next/<module>/<module>.service.next.ts` | `AuditLogNextService` |
| Modüle özgü UI bileşeni | `modules_next/<module>/ui/` | `auth.login.tsx` |
| Modüle özgü React hook | `modules_next/<module>/hooks/` | `use-notifications.hook.ts` |
| Paylaşılan UI bileşeni | `modules_next/common/ui/` | `Button.tsx`, `AdminShell.tsx` |
| React runtime tipleri | `modules_next/common/module.types.ts` | `LoadedModule`, `Widget` |

## Bağımlılık Yönü

```
app/  →  modules_next/  →  modules/
```

- `modules_next` her zaman `modules`'den import edebilir
- `modules` asla `modules_next`'ten import edemez
- `app/` her iki katmandan da import edebilir

## Express / Diğer Framework Kullanımı

Bu proje `modules/` katmanını başka bir framework ile de kullanmak üzere tasarlanmıştır. Express uygulaması yalnızca `modules/` altındaki dosyalara bağlanır; `modules_next/` ile ilgisi yoktur.
