# Ruleset Compliance Plan — next-boilerplate

> Kaynak: `Code_Structure_Rules` + `UI_Interface_Rules` uyumsuzluk denetimi (2026-05-04)
> Her madde bağımsız bir iş kalemi. Öncelik sırasına göre sıralanmıştır.

---

## Öncelik Etiketleri

| Etiket | Açıklama |
|---|---|
| `[KRİTİK]` | Projenin temel mimarisini kırıyor, hemen düzeltilmeli |
| `[YÜKSEK]` | Güvenlik, erişilebilirlik veya ana pattern ihlali |
| `[ORTA]` | Yapısal tutarsızlık veya eksik standart |
| `[DÜŞÜK]` | İnce kural ihlali, teknik borç |

---

## 1. Veritabanı Katmanı: Prisma → TypeORM `[KRİTİK]`

**Kural:** `database-patterns.md` — TypeORM only, Prisma yasak.

### Mevcut Durum

```
libs/prisma/
├── index.ts      ← systemPrisma, tenantPrismaFor re-export
├── system.ts     ← PrismaClient (system DB)
└── tenant.ts     ← PrismaClient factory (tenant DB)

prisma/
├── system/       ← Prisma schema + generated client
└── tenant/       ← Prisma schema + generated client
```

`package.json` bağımlılıkları: `@prisma/client`, `@prisma/adapter-pg`, `prisma`

### Hedef Durum

```
libs/typeorm/
├── index.ts      ← re-exports SystemDataSource + tenantDataSourceFor
├── system.ts     ← DataSource({ type: 'postgres', ... }) — SystemDataSource
└── tenant.ts     ← tenantDataSourceFor(tenantId: string): DataSource

migrations/         ← TypeORM system DB migrations
migrations-tenant/  ← TypeORM tenant DB migrations
```

```typescript
// libs/typeorm/system.ts
import { DataSource } from 'typeorm';
import { env } from '@/libs/env';

export const SystemDataSource = new DataSource({
  type: 'postgres',
  url: env.SYSTEM_DATABASE_URL,
  synchronize: false,
  logging: env.NODE_ENV === 'development',
  entities: ['modules/**/entities/*.ts'],
  migrations: ['migrations/*.ts'],
});
```

```typescript
// libs/typeorm/tenant.ts
import { DataSource } from 'typeorm';
import { env } from '@/libs/env';

const tenantCache = new Map<string, DataSource>();

export async function tenantDataSourceFor(tenantId: string): Promise<DataSource> {
  if (tenantCache.has(tenantId)) return tenantCache.get(tenantId)!;
  const ds = new DataSource({
    type: 'postgres',
    url: `${env.TENANT_DATABASE_URL}/${tenantId}`,
    synchronize: false,
    entities: ['modules/**/entities/*.ts'],
    migrations: ['migrations-tenant/*.ts'],
  });
  await ds.initialize();
  tenantCache.set(tenantId, ds);
  return ds;
}
```

```typescript
// libs/typeorm/index.ts
export { SystemDataSource } from './system';
export { tenantDataSourceFor } from './tenant';
```

### Etkilenen Dosyalar

- `libs/prisma/` → sil, `libs/typeorm/` oluştur
- `prisma/` klasörü → sil
- `prisma.config.ts`, `prisma.system.config.ts`, `prisma.tenant.config.ts` → sil
- `package.json` → `@prisma/*` ve `prisma` kaldır, `typeorm`, `reflect-metadata`, `pg` ekle
- Her `systemPrisma.X.findUnique(...)` çağrısını `SystemDataSource.getRepository(X).findOne(...)` olarak güncelle
- Her `tenantPrismaFor(tenantId).X.findMany(...)` → `(await tenantDataSourceFor(tenantId)).getRepository(X).find(...)` olarak güncelle
- Her modülde `entities/` klasörü oluştur, TypeORM `@Entity()` decorator'lı class'lar yaz

---

## 2. `@ts-ignore` → Module Augmentation `[KRİTİK]`

**Kural:** `typescript-rules.md` — `@ts-ignore` kesinlikle yasak. `global.d.ts` module augmentation kullan.

### Mevcut Durum

```typescript
// modules/user_session/user_session.service.next.ts:227-263
// @ts-ignore
request.user = user;
// @ts-ignore
request.userSession = userSession;
// @ts-ignore
request.isImpersonating = true;
// @ts-ignore
request.impersonatedBy = SafeUserSchema.parse(impersonatorUser);
// @ts-ignore
request.user = null;
```

Aynı durum: `modules/tenant_session/tenant_session.service.next.ts` (6 instance), `modules/user_session/user_session.token.service.ts` (2 instance)

### Hedef Durum

```typescript
// global.d.ts — mevcut dosyayı güncelle
import { NextRequest as OriginalNextRequest } from 'next/server';
import type { SafeUser } from '@/modules/user/user.types';
import type { SafeUserSession } from '@/modules/user_session/user_session.types';
import type { SafeTenant } from '@/modules/tenant/tenant.types';
import type { SafeTenantMember } from '@/modules/tenant_member/tenant_member.types';

declare module 'next/server' {
  interface NextRequest {
    user?: SafeUser | null;
    userSession?: SafeUserSession;
    tenant?: SafeTenant;
    tenantMember?: SafeTenantMember;
    isImpersonating?: boolean;
    impersonatedBy?: SafeUser;
  }
}
```

`declare module 'next/server'` ile augment edildiğinde `@ts-ignore` gerekmez:

```typescript
// ✅ @ts-ignore olmadan
(request as NextRequest).user = user;
(request as NextRequest).userSession = userSession;
```

### Etkilenen Dosyalar

- `global.d.ts` — `declare global { interface NextRequest... }` → `declare module 'next/server' { interface NextRequest... }`
- `modules/user_session/user_session.service.next.ts` — tüm `@ts-ignore` kaldır
- `modules/tenant_session/tenant_session.service.next.ts` — tüm `@ts-ignore` kaldır
- `modules/user_session/user_session.token.service.ts` — tüm `@ts-ignore` kaldır

---

## 3. Dark Mode: ThemeProvider + FOUC `[KRİTİK]`

**Kural:** `dark-light-mode.md` — `next-themes` + `suppressHydrationWarning` + FOUC önleme script'i zorunlu.

### Mevcut Durum

```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">           // ← suppressHydrationWarning yok
      <body ...>
        {children}             // ← ThemeProvider yok
      </body>
    </html>
  );
}
```

`next-themes` package yok. Tema toggle mekanizması yok.

### Hedef Durum

```bash
npm install next-themes
```

```typescript
// app/providers.tsx (yeni dosya)
'use client';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
```

```typescript
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-surface-base text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```typescript
// modules/ui/ThemeToggle.tsx (yeni dosya)
'use client';
import { useTheme } from 'next-themes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      type="button"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-overlay
                 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {theme === 'dark'
        ? <FontAwesomeIcon icon={faSun}  className="text-lg" aria-hidden />
        : <FontAwesomeIcon icon={faMoon} className="text-lg" aria-hidden />
      }
    </button>
  );
}
```

### Etkilenen Dosyalar

- `app/layout.tsx` — `suppressHydrationWarning` ekle, `Providers` wrap'le
- `app/providers.tsx` — yeni dosya oluştur
- `modules/ui/ThemeToggle.tsx` — yeni dosya oluştur
- `package.json` — `next-themes` ekle

---

## 4. `console.*` → `Logger` `[YÜKSEK]`

**Kural:** `logging-and-comments.md` — Logger sınıfı her yerde. `console.*` sadece `server.ts`/`index.ts` bootstrap'ta.

### Etkilenen Dosyalar ve Değişiklikler

**`modules/user_session/user_session.service.next.ts`**

```typescript
// ❌ Mevcut
console.warn('[UserSessionNextService] Invalid cache structure, deleting:', cacheKey);
console.error('[UserSessionNextService] Cache parsing failed:', error);
console.error("[AUTHENTICATE ERROR]", { message: error.message, ... });
console.error('[UserSessionNextService.logout] Cache parsing error:', e);

// ✅ Hedef
import Logger from '@/libs/logger';
Logger.warn(`[UserSessionNextService] Invalid cache structure, deleting: ${cacheKey}`);
Logger.error(`[UserSessionNextService] Cache parsing failed: ${error}`);
Logger.error(`[UserSessionNextService] Authentication error: ${error.message}`);
Logger.error(`[UserSessionNextService] Logout cache parse error: ${e}`);
```

**`modules/tenant_domain/tenant_domain.service.ts`**

```typescript
// ❌ Mevcut
console.log(`TenantDomainService.getByDomain: Domain not found: ${domain}`);
console.log(`TenantDomainService.getByDomain: Found domain: ${domain} → tenantId: ${found.tenantId}`);

// ✅ Hedef
Logger.warn(`[TenantDomainService] Domain not found: ${domain}`);
Logger.info(`[TenantDomainService] Domain resolved: ${domain} → tenantId: ${found.tenantId}`);
```

**`modules/tenant/tenant.service.ts`**

```typescript
// ❌ Mevcut
console.log('Querying tenants with where clause:', where);

// ✅ Hedef (debug log'sa sil; bilgi amaçlıysa)
Logger.info(`[TenantService] Querying tenants`);
```

**`app/system/api/auth/login/route.ts` ve diğer route handler'lar (~10 dosya)**

```typescript
// ❌ Mevcut
console.error(error);

// ✅ Hedef
import Logger from '@/libs/logger';
Logger.error(`[POST /system/api/auth/login] ${error.message}`);
```

---

## 5. Radix UI: Modal, Tooltip, Dropdown `[YÜKSEK]`

**Kural:** `modals-and-overlays.md` — Next.js'te `@radix-ui/react-dialog`, `@radix-ui/react-tooltip`, `@radix-ui/react-dropdown-menu`.

### Yükleme

```bash
npm install @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-dropdown-menu
```

### 5a. Modal → Radix Dialog

```typescript
// modules/ui/Modal.tsx — mevcut custom implementasyonu kaldır, Radix kullan
'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/libs/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
} as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full border border-border bg-surface-raised shadow-xl rounded-xl flex flex-col',
            'focus:outline-none',
            sizeClass[size],
            className
          )}
        >
          <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border shrink-0">
            <div>
              <Dialog.Title className="text-base font-semibold text-text-primary">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="text-sm text-text-secondary mt-0.5">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close dialog"
                className="shrink-0 text-text-disabled hover:text-text-primary transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          {children && <div className="px-6 py-4 flex-1 overflow-y-auto">{children}</div>}
          {footer && (
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2 shrink-0">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### 5b. Tooltip → Radix Tooltip

```typescript
// modules/ui/Tooltip.tsx — Radix implementasyonu
'use client';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cn } from '@/libs/utils/cn';

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 400,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}) {
  return (
    <RadixTooltip.Provider delayDuration={delay}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={4}
            className={cn(
              'px-2 py-1 text-xs rounded border border-border bg-surface-overlay text-text-primary shadow-sm',
              'animate-in fade-in-0 zoom-in-95 z-50'
            )}
          >
            {content}
            <RadixTooltip.Arrow className="fill-surface-overlay" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
```

### 5c. RowActionsMenu → Radix Dropdown (yeni bileşen)

```typescript
// modules/ui/RowActionsMenu.tsx (yeni dosya)
'use client';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/libs/utils/cn';

type Action = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
};

export function RowActionsMenu({ actions }: { actions: Action[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Row actions"
          className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-surface-overlay
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <FontAwesomeIcon icon={faEllipsisVertical} aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="w-40 rounded-lg border border-border bg-surface-base shadow-lg py-1 z-50
                     animate-in fade-in-0 zoom-in-95"
        >
          {actions.map((action) => (
            <DropdownMenu.Item
              key={action.label}
              onSelect={action.onClick}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer outline-none',
                'hover:bg-surface-overlay focus:bg-surface-overlay',
                action.variant === 'danger'
                  ? 'text-error hover:bg-error-subtle focus:bg-error-subtle'
                  : 'text-text-primary'
              )}
            >
              {action.icon && <span className="w-4 text-center" aria-hidden>{action.icon}</span>}
              {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
```

### Etkilenen Dosyalar

- `modules/ui/Modal.tsx` — Radix Dialog ile yeniden yaz
- `modules/ui/Tooltip.tsx` — Radix Tooltip ile yeniden yaz
- `modules/ui/RowActionsMenu.tsx` — yeni dosya oluştur
- `package.json` — Radix paketleri ekle

---

## 6. Erişilebilirlik: Skip-to-Content + Focus Trap `[YÜKSEK]`

**Kural:** `accessibility.md` — Skip link zorunlu. Modal focus trap (Tab cycling). Dekoratif ikonlar `aria-hidden`.

### 6a. Skip-to-Content Link

```typescript
// modules/app/AppShell.tsx — <main> öncesine ekle
return (
  <div className={cn('flex h-screen overflow-hidden bg-surface-base', className)} {...rest}>
    {/* Skip link — ilk focusable eleman */}
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100]
                 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-fg focus:rounded-md
                 focus:text-sm focus:font-medium focus:ring-2 focus:ring-border-focus"
    >
      Skip to content
    </a>
    {/* ... mevcut içerik */}
  </div>
);
```

> `<main id="main-content">` zaten mevcut — skip link bağlantısı çalışıyor.

### 6b. Modal Focus Trap — Radix ile Otomatik Çözüm

Madde 5a'daki Radix Dialog değişikliği yapıldığında focus trap otomatik gelir — Radix Dialog built-in focus trap ve Escape handling sağlar. Mevcut `modules/ui/Modal.tsx`'teki manuel `useEffect` focus kodu kaldırılır.

### 6c. Dekoratif Simgelere `aria-hidden`

```typescript
// modules/app/AdminShell.tsx — sidebar nav ikonları
// ❌ Mevcut
{ id: 'users', label: 'Users', icon: <FontAwesomeIcon icon={faUsers} /> }

// ✅ Hedef
{ id: 'users', label: 'Users', icon: <FontAwesomeIcon icon={faUsers} aria-hidden /> }
```

```typescript
// modules/ui/Modal.tsx close button (Radix ile birlikte)
// ❌ Mevcut (custom impl.)
<FontAwesomeIcon icon={faXmark} className="w-4 h-4" />

// ✅ Hedef
<FontAwesomeIcon icon={faXmark} className="w-4 h-4" aria-hidden />
```

### 6d. Tooltip `aria-describedby`

Madde 5b'deki Radix Tooltip değişikliği yapıldığında `aria-describedby` Radix tarafından otomatik atanır. Mevcut custom implementasyonda bu eksikti.

### Etkilenen Dosyalar

- `modules/app/AppShell.tsx` — skip link ekle
- `modules/app/AdminShell.tsx` — nav ikonlarına `aria-hidden` ekle
- `modules/ui/Modal.tsx` — Radix ile otomatik çözülür (madde 5a)
- `modules/ui/Tooltip.tsx` — Radix ile otomatik çözülür (madde 5b)

---

## 7. Feedback: react-toastify → Zustand Toast Store `[YÜKSEK]`

**Kural:** `feedback-and-notifications.md` — Next.js'te Zustand toast store + portal.

### Yükleme Değişikliği

```bash
npm uninstall react-toastify
```

### Hedef Yapı

```typescript
// modules/ui/toast.store.ts (yeni dosya)
import { create } from 'zustand';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
};

type ToastStore = {
  toasts: Toast[];
  add: (message: string, variant: ToastVariant, duration?: number) => void;
  remove: (id: string) => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, variant, duration = 4000) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { id: crypto.randomUUID(), message, variant, duration },
      ],
    })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().add(msg, 'success'),
  error:   (msg: string) => useToastStore.getState().add(msg, 'error'),
  warning: (msg: string) => useToastStore.getState().add(msg, 'warning'),
  info:    (msg: string) => useToastStore.getState().add(msg, 'info'),
};
```

```typescript
// modules/ui/ToastContainer.tsx (yeni dosya)
'use client';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToastStore } from './toast.store';
import { cn } from '@/libs/utils/cn';

const variantClass: Record<string, string> = {
  success: 'bg-success text-success-fg border-success',
  error:   'bg-error text-text-inverse border-error',
  warning: 'bg-warning text-warning-fg border-warning',
  info:    'bg-info text-info-fg border-info',
};

export function ToastContainer() {
  const { toasts, remove } = useToastStore();

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={remove} />
      ))}
    </div>,
    document.body
  );
}

function ToastItem({ toast: t, onRemove }: { toast: any; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(t.id), t.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onRemove]);

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start justify-between gap-3 px-4 py-3 rounded-lg border shadow-md text-sm font-medium',
        variantClass[t.variant]
      )}
    >
      <span>{t.message}</span>
      <button
        type="button"
        onClick={() => onRemove(t.id)}
        aria-label="Dismiss notification"
        className="shrink-0 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current rounded"
      >
        ×
      </button>
    </div>
  );
}
```

```typescript
// app/providers.tsx — ToastContainer ekle
import { ToastContainer } from '@/modules/ui/ToastContainer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <ToastContainer />
    </ThemeProvider>
  );
}
```

### Etkilenen Dosyalar

- `modules/ui/toast.store.ts` — yeni dosya
- `modules/ui/ToastContainer.tsx` — yeni dosya
- `app/providers.tsx` — `ToastContainer` ekle (madde 3 ile birlikte)
- Tüm `react-toastify` import'larını `@/modules/ui/toast.store` ile değiştir
- `package.json` — `react-toastify` kaldır

---

## 8. Folder Yapısı: `modules/app` + `modules/domains` `[YÜKSEK]`

**Kural:** `folder-structure.md` — Shared UI bileşenleri `modules/ui/layout/` altında. Her domain UI bileşeni ilgili modülün `ui/` alt klasöründe. `components/` yasak.

### 8a. `modules/app/` → `modules/ui/layout/`

```
Mevcut                              Hedef
────────────────────────────────    ────────────────────────────────────────
modules/app/AppShell.tsx        →   modules/ui/layout/AppShell.tsx
modules/app/AppSidebar.tsx      →   modules/ui/layout/AppSidebar.tsx
modules/app/AppTopBar.tsx       →   modules/ui/layout/AppTopBar.tsx
modules/app/AdminShell.tsx      →   modules/ui/layout/AdminShell.tsx
modules/app/Form.tsx            →   modules/ui/Form.tsx  (ya da forms/ altına)
```

Taşıma sonrası tüm import path'leri güncelle:
```typescript
// ❌ Mevcut
import { AppShell } from '@/modules/app/AppShell';

// ✅ Hedef
import { AppShell } from '@/modules/ui/layout/AppShell';
```

### 8b. `modules/domains/` → İlgili Modül `ui/` Klasörleri

```
Mevcut                                          Hedef
──────────────────────────────────────────────  ─────────────────────────────────────────────
modules/domains/common/auth/LoginForm.tsx    →  modules/auth/ui/auth.login.tsx
modules/domains/common/auth/RegisterForm.tsx →  modules/auth/ui/auth.register.tsx
modules/domains/common/auth/ForgotPasswordForm.tsx → modules/auth/ui/auth.forgot-password.tsx
modules/domains/common/auth/OAuthButtons.tsx →  modules/auth/ui/auth.oauth-buttons.tsx
modules/domains/common/auth/SessionExpiredBanner.tsx → modules/auth/ui/auth.session-expired.tsx
modules/domains/api-doc/ApiDocsPage.tsx      →  modules/api_doc/ui/api_doc.page.tsx
modules/domains/api-doc/ApiTagSection.tsx    →  modules/api_doc/ui/api_doc.tag-section.tsx
(diğer api-doc dosyaları aynı pattern ile)
```

Dosyaları taşıdıktan sonra `modules/domains/` klasörünü sil. İlgili `app/` route dosyalarındaki import path'lerini güncelle.

### Etkilenen Dosyalar

- `modules/app/` içindeki tüm dosyalar — taşı
- `modules/domains/` içindeki tüm dosyalar — taşı
- `app/**/layout.tsx`, `app/**/page.tsx` dosyalarında import path'leri — güncelle

---

## 9. Health Check Route `[ORTA]`

**Kural:** `nextjs-routing.md` — `app/system/api/health/route.ts` zorunlu (DB + Redis readiness probe, auth ve rate limit yok).

### Yeni Dosya

```typescript
// app/system/api/health/route.ts
import { NextResponse } from 'next/server';
import { SystemDataSource } from '@/libs/typeorm'; // madde 1 tamamlandıktan sonra
import redis from '@/libs/redis';

export async function GET() {
  try {
    await SystemDataSource.query('SELECT 1');
    await redis.ping();
    return NextResponse.json({ status: 'ok', db: 'ok', redis: 'ok' });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', error: error.message },
      { status: 503 }
    );
  }
}
```

---

## 10. Tablo: aria-sort + Bulk Selection + Row Actions `[ORTA]`

**Kural:** `tables-and-data-display.md` — `aria-sort` sortable header'larda, bulk selection checkbox, row actions dropdown.

### `modules/ui/ServerDataTable.tsx` Güncellemeleri

**aria-sort eklenmesi:**

```typescript
// TableColumn tipine sort prop ekle
export type TableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;     // ← ekle
  sortDir?: 'asc' | 'desc' | 'none'; // ← ekle
  onSort?: () => void;    // ← ekle
};

// <th> içinde
<th
  key={String(col.key)}
  scope="col"
  aria-sort={col.sortable ? (col.sortDir ?? 'none') : undefined}  // ← ekle
  className={cn(
    'px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider',
    col.sortable && 'cursor-pointer select-none hover:text-text-primary',
    col.align === 'center' && 'text-center',
    col.align === 'right'  && 'text-right',
    !col.align             && 'text-left'
  )}
  onClick={col.sortable ? col.onSort : undefined}
>
  <span className="inline-flex items-center gap-1">
    {col.header}
    {col.sortable && col.sortDir === 'asc'  && <FontAwesomeIcon icon={faArrowUp}   className="w-3" aria-hidden />}
    {col.sortable && col.sortDir === 'desc' && <FontAwesomeIcon icon={faArrowDown} className="w-3" aria-hidden />}
  </span>
</th>
```

**Bulk selection:**

```typescript
// ServerDataTableProps tipine ekle
selectedKeys?: Set<string>;
onSelectAll?: (checked: boolean) => void;
onSelectRow?: (key: string, checked: boolean) => void;

// Tablo içinde — header checkbox
{(onSelectAll) && (
  <th scope="col" className="w-10 px-4 py-3">
    <input
      type="checkbox"
      aria-label="Select all rows"
      checked={selectedKeys?.size === rows.length && rows.length > 0}
      onChange={(e) => onSelectAll?.(e.target.checked)}
      className="h-4 w-4 rounded border-border text-primary
                 focus-visible:ring-2 focus-visible:ring-border-focus"
    />
  </th>
)}

// Satır checkbox'ı
{(onSelectRow) && (
  <td className="w-10 px-4 py-4">
    <input
      type="checkbox"
      aria-label={`Select row`}
      checked={selectedKeys?.has(getRowKey(row)) ?? false}
      onChange={(e) => onSelectRow?.(getRowKey(row), e.target.checked)}
      className="h-4 w-4 rounded border-border text-primary
                 focus-visible:ring-2 focus-visible:ring-border-focus"
    />
  </td>
)}
```

---

## 11. Naming: `modules/domains/api-doc` → `modules/api_doc` `[ORTA]`

**Kural:** `naming-conventions.md` — Module klasörleri `snake_case`. UI dosyaları `[module].[context].tsx`.

Bu madde madde 8b ile birlikte yürütülür. Bağımsız olarak yapılabilecek rename:

```
modules/domains/api-doc/  →  modules/api_doc/ui/
modules/domains/common/   →  ilgili modüllerin ui/ alt klasörleri
```

---

## 12. Typography: `next/font` `[ORTA]`

**Kural:** `typography.md` — Next.js'te `next/font` ile CSS variable injection.

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-surface-base text-text-primary antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```css
/* app/globals.css — font token bağla */
@theme inline {
  --font-sans: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
}
```

---

## 13. `env.ts`: `SESSION_CACHE_TTL` Default `[DÜŞÜK]`

**Kural:** `env-and-config.md` — Zod default ile yönet, servis katmanında `parseInt` + fallback yapma.

```typescript
// libs/env.ts — değişiklik
SESSION_CACHE_TTL: z.coerce.number().default(1800),  // ← .optional() yerine .default(1800)
```

```typescript
// modules/user_session/user_session.service.next.ts — değişiklik
// ❌ Mevcut
const SESSION_CACHE_TTL = parseInt(env.SESSION_CACHE_TTL || `${60 * 30}`);

// ✅ Hedef
const SESSION_CACHE_TTL = env.SESSION_CACHE_TTL; // Zod default garantiler
```

---

## 14. İkon: `aria-hidden` Eksikleri `[DÜŞÜK]`

**Kural:** `icon-system.md` — Her dekoratif ikon `aria-hidden="true"`.

```typescript
// modules/app/AdminShell.tsx içindeki tüm nav ikonları
// ❌ Mevcut
icon: <FontAwesomeIcon icon={faUsers} />

// ✅ Hedef
icon: <FontAwesomeIcon icon={faUsers} aria-hidden />
```

```typescript
// modules/ui/Modal.tsx close button ikonu
// ❌ Mevcut
<FontAwesomeIcon icon={faXmark} className="w-4 h-4" />

// ✅ Hedef
<FontAwesomeIcon icon={faXmark} className="w-4 h-4" aria-hidden />
```

---

## Uygulama Sırası (Önerilen)

Bağımlılıklar göz önüne alındığında önerilen yürütme sırası:

```
Faz 1 — Altyapı (başka hiçbir şeye bağlı değil)
  ├── [1] Prisma → TypeORM
  ├── [2] @ts-ignore → module augmentation
  └── [13] env.ts SESSION_CACHE_TTL default

Faz 2 — UI Temeli (birbirinden bağımsız)
  ├── [3] Dark mode ThemeProvider
  ├── [5] Radix UI: Modal + Tooltip + Dropdown
  └── [7] Toast: react-toastify → Zustand store

Faz 3 — Yapısal Düzenlemeler
  ├── [8] modules/app + modules/domains taşıma
  ├── [11] Naming: snake_case (8 ile birlikte)
  └── [12] next/font (3 ile birlikte, layout.tsx)

Faz 4 — Kural Tamamlama
  ├── [4] console.* → Logger (12+ dosya)
  ├── [6] Erişilebilirlik: skip link + aria-hidden
  ├── [9] Health check route
  ├── [10] Tablo: aria-sort + bulk selection
  └── [14] Kalan aria-hidden eksikleri
```

---

## Değişmeyecek Alanlar (Uyumlu)

Mevcut boilerplate'te aşağıdaki alanlar kurallara uygundur, değişiklik gerekmez:

- `libs/env.ts` — Zod validated, tüm `process.env` erişimi merkezi ✓
- `libs/app-error.ts` — `AppError` pattern doğru ✓
- `libs/redis/bullmq.ts` — BullMQ doğru yerde ✓
- `libs/axios/index.ts` — axios client mevcut ✓
- `libs/utils/cn.ts` — `cn()` utility ✓
- `modules/*/[module].dto.ts` — Zod `safeParse` pattern (route sınırında) ✓
- `modules/*/[module].messages.ts` — TypeScript enum (Messages için kabul edilebilir) ✓
- `modules/*/[module].enums.ts` — Zod enum pattern ✓
- `app/globals.css` — CSS custom property token sistemi, dark mode token'ları ✓
- `modules/ui/Button.tsx` — `focus-visible:ring`, `aria-busy`, variant/size prop'ları ✓
- FontAwesome 7 + `@fortawesome/react-fontawesome` ✓
- Tailwind 4 + `tailwind-merge` + `clsx` ✓
- Zustand v5 ✓
- `modules/` root düzeyinde (src/ wrapper yok) ✓
- `snake_case` module klasör adları (auth_sso, tenant_member, vb.) ✓
