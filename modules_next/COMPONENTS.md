# COMPONENTS.md — Next/React Component Catalog

> **Single-page index of every React component, hook, and Next-bound service in `modules_next/`.**
> Need the architectural picture? See [../AGENTS.md](../AGENTS.md). Need the business-logic side? See [../modules/MODULES.md](../modules/MODULES.md).

## Layer rules (recap)

- `modules_next/` is the **only** layer where React + Next imports are allowed.
- One-way dependency: `app/ → modules_next/ → modules/`.
- Component placement rule:
  - **Used in ≥ 2 modules** → [common/ui/](common/ui/)
  - **App-shell / layout chrome** → [common/ui/layout/](common/ui/layout/)
  - **Tied to one module** → `<module>/ui/`
- React hooks live under `<module>/hooks/use-*.hook.ts` (kebab-case + `.hook.ts` suffix).
- Next service extensions live as `<module>/<module>.service.next.ts`.

---

## Shared infrastructure ([common/](common/))

### Axios client ([common/axios/](common/axios/))

| File | Export | Purpose |
|---|---|---|
| [axios.client.ts](common/axios/axios.client.ts) | `axiosInstance` | Pre-configured axios with `withCredentials: true`. **The single HTTP boundary** — mock this in component tests. |
| [index.ts](common/axios/index.ts) | re-exports | Barrel. |

### Utilities ([common/utils/](common/utils/))

| File | Export | Purpose |
|---|---|---|
| [cn.ts](common/utils/cn.ts) | `cn(...classes)` | `clsx` + `tailwind-merge` — every component uses this for conditional classes. |

### Runtime types ([common/module.types.ts](common/module.types.ts))

React-aware module-runtime types (uses `React.ComponentType`, which `modules/module.types.ts` cannot):
`SettingsTab`, `Route`, `Widget`, `LoadedModule`, `ModuleRegistry`.

---

## Shared UI primitives ([common/ui/](common/ui/))

Atomic + composite components — these are the design-system primitives every module uses.

### Atomic

| Component | File | Notes |
|---|---|---|
| `AlertBanner` | [AlertBanner.tsx](common/ui/AlertBanner.tsx) | Info/warning/error/success banner |
| `Avatar` | [Avatar.tsx](common/ui/Avatar.tsx) | Circular image w/ fallback initials |
| `AvatarUpload` | [AvatarUpload.tsx](common/ui/AvatarUpload.tsx) | Crop-and-upload avatar (uses `react-easy-crop`) |
| `Badge` | [Badge.tsx](common/ui/Badge.tsx) | Status pill (CVA variants) |
| `BrandLogo` | [BrandLogo.tsx](common/ui/BrandLogo.tsx) | Resolves logo URL from tenant branding or system setting |
| `Breadcrumb` | [Breadcrumb.tsx](common/ui/Breadcrumb.tsx) | A11y-aware breadcrumb |
| `Button` | [Button.tsx](common/ui/Button.tsx) · [.test.tsx](common/ui/Button.test.tsx) | CVA variants: primary/secondary/ghost/danger × sizes |
| `Card` | [Card.tsx](common/ui/Card.tsx) | Surface container with header/body slots |
| `DateRangePicker` | [DateRangePicker.tsx](common/ui/DateRangePicker.tsx) | From/to date picker |
| `Drawer` | [Drawer.tsx](common/ui/Drawer.tsx) | Side drawer (Radix Dialog under the hood) |
| `EmptyState` | [EmptyState.tsx](common/ui/EmptyState.tsx) | Icon + headline + CTA |
| `FileInput` | [FileInput.tsx](common/ui/FileInput.tsx) | Drag/drop file input |
| `Form` | [Form.tsx](common/ui/Form.tsx) | `react-hook-form` + Zod wrapper |
| `Input` | [Input.tsx](common/ui/Input.tsx) | Text/number/password/email |
| `Modal` | [Modal.tsx](common/ui/Modal.tsx) | Radix Dialog with header/body/footer |
| `Pagination` | [Pagination.tsx](common/ui/Pagination.tsx) | Page-number control |
| `RadioGroup` | [RadioGroup.tsx](common/ui/RadioGroup.tsx) | Radio set |
| `SearchBar` | [SearchBar.tsx](common/ui/SearchBar.tsx) | Debounced search input |
| `Select` | [Select.tsx](common/ui/Select.tsx) | Single/multi select dropdown |
| `Skeleton` | [Skeleton.tsx](common/ui/Skeleton.tsx) · [.test.tsx](common/ui/Skeleton.test.tsx) | Loading placeholder |
| `Spinner` | [Spinner.tsx](common/ui/Spinner.tsx) | Loading spinner |
| `SkipToContent` | [SkipToContent.tsx](common/ui/SkipToContent.tsx) | A11y skip link |
| `TabGroup` | [TabGroup.tsx](common/ui/TabGroup.tsx) | Tabbed view |
| `ThemeToggle` | [ThemeToggle.tsx](common/ui/ThemeToggle.tsx) | Light/dark/system (uses `next-themes`) |
| `Toggle` | [Toggle.tsx](common/ui/Toggle.tsx) | Boolean switch |
| `Tooltip` | [Tooltip.tsx](common/ui/Tooltip.tsx) | Radix Tooltip |

### Composite

| Component | File | Notes |
|---|---|---|
| `ServerDataTable` | [ServerDataTable.tsx](common/ui/ServerDataTable.tsx) | Server-paginated/filtered table — primary list view in admin panels |
| `NotificationMenu` | [NotificationMenu.tsx](common/ui/NotificationMenu.tsx) | Header notification dropdown (consumes `notification_inapp` hook) |
| `RowActionsMenu` | [RowActionsMenu.tsx](common/ui/RowActionsMenu.tsx) | Per-row "⋯" menu in tables |
| `PageHeader` | [PageHeader.tsx](common/ui/PageHeader.tsx) | Title + breadcrumb + actions |
| `ToastContainer` | [ToastContainer.tsx](common/ui/ToastContainer.tsx) | Renders the toast queue |
| `toast.store.ts` | [toast.store.ts](common/ui/toast.store.ts) | Zustand store: `toast.success()`, `toast.error()`, … |

Detailed conventions: [common/ui/README.md](common/ui/README.md).

---

## App shell ([common/ui/layout/](common/ui/layout/))

| Component | File | Use |
|---|---|---|
| `AppShell` | [AppShell.tsx](common/ui/layout/AppShell.tsx) | Public-facing pages (auth, marketing) |
| `AdminShell` | [AdminShell.tsx](common/ui/layout/AdminShell.tsx) | Admin dashboards (system + tenant) — wraps sidebar + topbar |
| `AppSidebar` | [AppSidebar.tsx](common/ui/layout/AppSidebar.tsx) | Left navigation, role-aware menu items |
| `AppTopBar` | [AppTopBar.tsx](common/ui/layout/AppTopBar.tsx) | Top bar: brand, user menu, notifications |
| `FontAwesomeConfig` | [common/ui/layout/FontAwesomeConfig.tsx](common/ui/layout/FontAwesomeConfig.tsx) | One-time FA SVG config (CSS strategy) |

---

## Per-module UI

| Module | UI components |
|---|---|
| [ai](ai/ui/) | `AIChatBox` |
| [api_doc](api_doc/ui/) | Swagger UI wrapper |
| [audit_log](audit_log/ui/) | List + filter views |
| [auth](auth/ui/) | `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `OAuthButtons`, `SessionExpiredBanner` |
| [auth_saml](auth_saml/ui/) | SAML config form |
| [coupon](coupon/ui/) | Coupon list / redeem dialog |
| [payment](payment/ui/) | `PaymentStatusBadge`, `PaymentSummaryCard` |
| [tenant](tenant/ui/) | `CreateTenantForm`, `TenantSelectorCard` |
| [tenant_subscription](tenant_subscription/ui/) | `SubscriptionPlanCard`, `PlanUsageMeter`, `FeatureGate`, `GracePeriodBanner`, `UpgradePrompt` |
| [user](user/ui/) | `UserMenu`, `UserProfileCard`, `UserProfileForm`, `UserPreferencesForm`, `UserStatusBadge`, `UserRoleBadge`, `SocialAccountsPanel` |
| [user_security](user_security/ui/) | Passkey + TOTP management UI |

## Per-module hooks

| Module | Hook | Returns |
|---|---|---|
| [notification_inapp](notification_inapp/hooks/) | `use-notifications.hook.ts` | Live in-app notification feed (consumes the inapp service) |
| [tenant_subscription](tenant_subscription/hooks/) | `use-feature-access.ts` | `hasFeature(key) → boolean` based on current plan |
| [tenant_subscription](tenant_subscription/hooks/) | `use-grace-period.ts` | Grace-period state for the active tenant |

## Per-module Next service extensions (`*.service.next.ts`)

These wrap the framework-agnostic service from `modules/<module>/` and add Next-specific concerns (cookies, headers, `NextRequest`).

| Module | File | Adds |
|---|---|---|
| [audit_log](audit_log/audit_log.service.next.ts) | `AuditLogNextService` | `extractRequestContext(req)` from headers/IP/UA |
| [tenant_session](tenant_session/tenant_session.service.next.ts) | tenant-session resolver | Reads tenant from request URL/host |
| [user_session](user_session/user_session.service.next.ts) | session resolver | Reads JWT from httpOnly cookies |
| [limiter](limiter/limiter.service.next.ts) | rate-limit handler | Per-IP / per-user rate limiting using `NextRequest` |
| [redis_idempotency](redis_idempotency/withIdempotency.ts) | `withIdempotency()` | Wrap a route handler to enforce `Idempotency-Key` header |

---

## Where to put a new component

```
New component is…                            → put it in
─────────────────────────────────────────────────────────────────────────────
A primitive used by ≥ 2 modules              → modules_next/common/ui/
App-shell / sidebar / topbar piece           → modules_next/common/ui/layout/
Tied to exactly one module                    → modules_next/<module>/ui/
A React hook tied to one module               → modules_next/<module>/hooks/use-X.hook.ts
A Next-only service (uses NextRequest etc.)   → modules_next/<module>/<module>.service.next.ts
```

After adding, **update this file**. The catalog is the AI-discovery entry point — outdated entries are worse than no entries.

## Imports

```ts
// shared
import { Button } from "@/modules_next/common/ui/Button";
import { AdminShell } from "@/modules_next/common/ui/layout/AdminShell";
import { axiosInstance } from "@/modules_next/common/axios";
import { cn } from "@/modules_next/common/utils/cn";

// per-module
import { LoginForm } from "@/modules_next/auth/ui/LoginForm";
import { useFeatureAccess } from "@/modules_next/tenant_subscription/hooks/use-feature-access";
```

## Testing

- React component tests use Vitest + `@testing-library/react`.
- **Mock the `axiosInstance` boundary** for any component that hits the API. Don't mock React Query / SWR / fetch directly.
- Test files are colocated as `<Component>.test.tsx`.
