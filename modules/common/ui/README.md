# modules/ui

Shared UI component library for the Next Boilerplate project.

## Components

### Layout
- **AppShell** — Root shell with sidebar + top bar layout
- **AdminShell** — Admin-specific shell wrapper
- **AppSidebar** — Collapsible sidebar with nav groups, badge support, and `aria-current` on active items
- **AppTopBar** — Top navigation bar with actions slot

### Feedback
- **AlertBanner** — Inline alert with variant (success/error/warning/info)
- **Badge** — Status chip with variants and optional dismiss button (CVA-based)
- **EmptyState** — Empty list / no results placeholder
- **Spinner** — Loading spinner icon
- **Skeleton / SkeletonText / SkeletonCard / SkeletonTable** — Shape-matched loading placeholders with `animate-pulse`, `aria-busy="true"`, and `motion-reduce` support
- **ToastContainer** — Toast notification renderer (reads from Zustand `toast.store.ts`)

### Inputs
- **Button** — Multi-variant, multi-size button with loading state (CVA-based)
- **Input** — Text input with label, error state
- **Form** — Form wrapper with react-hook-form context
- **Select** — Dropdown select field
- **Toggle** — Boolean toggle switch
- **RadioGroup** — Radio button group
- **FileInput** — File picker with drag-and-drop
- **SearchBar** — Search input with debounce
- **DateRangePicker** — Date range picker component
- **ColorPicker** — Color swatch + hex / native picker, supports `iconOnly` toolbar trigger
- **RichTextEditor** — Quill-backed rich text editor (toolbar, bubble menu, mentions, slash commands, tables, emoji, HTML/fullscreen modes, autosave). Per-instance Zustand store via `RichTextEditorStoreProvider`

### Overlays
- **Modal** — Dialog overlay (Radix `@radix-ui/react-dialog`)
- **Drawer** — Slide-in panel
- **Tooltip** — Hover tooltip (Radix `@radix-ui/react-tooltip`)
- **RowActionsMenu** — Contextual row action dropdown (Radix `@radix-ui/react-dropdown-menu`)

### Data
- **ServerDataTable** — Server-side paginated table with `aria-sort` support
- **Pagination** — Page navigation component
- **TabGroup** — Tabbed content switcher
- **Card** — Generic content card
- **CommunityProvidersCard** — STANDARD panel for a provider module's settings tab. Given an
  extension `point` (e.g. `auth_sso:provider`, `mail:provider`, `sms:provider`,
  `storage:provider`, `ai:provider`, `payment:gateway`, `push:provider`), it lists the
  tenant's **installed** community plugins for that point (read from the marketplace
  community catalog, filtered by `points`), each with its Active/Inactive state and a
  gear → Marketplace "Configure" link. Reads `tenantId` from the `/tenant/[tenantId]`
  route. Use this — do NOT hardcode provider lists in settings tabs.
  Usage: `<CommunityProvidersCard point="mail:provider" title="Email Providers" />`

### Navigation
- **Breadcrumb** — Breadcrumb trail with `aria-current="page"` on last item
- **PageHeader** — Page title + action bar

### Accessibility
- **SkipToContent** — Keyboard skip link; renders visually hidden, visible on focus. Pair with `<main id="main-content">` in `app/layout.tsx`

### Branding
- **Avatar / AvatarUpload** — User avatar with upload
- **BrandLogo** — Tenant branding logo
- **NotificationMenu** — Notification bell with dropdown

### Theme
- **ThemeToggle** — Light / Dark / System theme switcher (next-themes)
- **FontAwesomeConfig** — FontAwesome library initializer (renders once in root layout)

## State

- **toast.store.ts** — Zustand toast store. Use `useToastStore()` to push/dismiss toasts.

## Patterns

### CVA variants
`Button` and `Badge` use `class-variance-authority` for variant definitions. When adding new variant-based components, follow the same pattern.

### Accessibility
- All interactive components have `focus-visible:ring-2` focus styles
- `aria-current`, `aria-expanded`, `aria-busy`, `aria-label` applied where relevant
- `SkipToContent` must be the first element in the DOM (placed in `app/layout.tsx`)
- Dev-time `@axe-core/react` audit runs in `app/providers.tsx`

### Icons
All icons use `@fortawesome/react-fontawesome` with `aria-hidden="true"` to prevent screen reader duplication.
