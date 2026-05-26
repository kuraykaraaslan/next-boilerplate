# Dynamic Page modülü — Type duplikasyon raporu (Detaylı)

## Genel Bakış

- **Modül:** `dynamic_page`
- **Dosya sayısı:** 
  - modules/ (9 dosya): entities (3), types, dto, enums, service, messages, index
  - modules_next/dynamic_page/ (37 dosya): Renderer, Editor (complex state + modals), Blocks (Hero, Custom, PopupModal), partials, utils, migrations
  - app/ (7 admin/api dosya): blocks + pages list/edit, public renderer, API routes (6 endpoint)
- **Canonical types kaynakları:** 
  - `modules/dynamic_page/dynamic_page.types.ts` — Zod schemas (BlockData, PageMetadata, DynamicPageRecord, DynamicPageBlockRecord)
  - `modules/dynamic_page/dynamic_page.dto.ts` — Request DTOs (CreatePageDTO, UpdatePageDTO, etc.)
  - `modules/dynamic_page/dynamic_page.enums.ts` — DynamicPageStatus enum
  - `modules/dynamic_page/entities/*.entity.ts` — TypeORM entities
  - `modules_next/dynamic_page/dynamic/types.ts` — UI-side types (FieldSchema, BlockDefinition, DynamicPageBlockRecord re-export)

---

## Duplikasyonlar (Gerçek)

### Duplikasyon 1: `BlockDef` (type)

**Kanon kaynağı:** `modules/dynamic_page/dynamic_page.types.ts:53-67`
```typescript
export const DynamicPageBlockRecordSchema = z.object({
  blockId: z.string(),
  tenantId: z.string(),
  type: z.string(),
  label: z.string(),
  category: z.string().default('General'),
  description: z.string().nullish(),
  schema: z.record(z.string(), z.unknown()).default({}),
  defaultProps: z.record(z.string(), z.unknown()).default({}),
  template: z.string().default(''),
  script: z.string().nullish(),
  isSystem: z.boolean().default(false),
  createdAt: z.preprocess(...),
  updatedAt: z.preprocess(...),
})
export type DynamicPageBlockRecord = z.infer<typeof DynamicPageBlockRecordSchema>
```

**Duplike yerler:**

1. **`/home/kuray/next-boilerplate/app/tenant/[tenantId]/admin/(tenant-scope)/blocks/page.tsx:18`**
   ```typescript
   type BlockDef = {
     blockId: string;
     type: string;
     label: string;
     category: string;
     isSystem: boolean;
     createdAt: string;
   };
   ```
   - **Eksikler:** `tenantId`, `description`, `schema`, `defaultProps`, `template`, `script`, `updatedAt`
   - **Neden:** Liste sayfası sadece temel bilgiler gösteriyor

2. **`/home/kuray/next-boilerplate/app/tenant/[tenantId]/admin/(tenant-scope)/blocks/[blockId]/page.tsx:13`**
   ```typescript
   type BlockDef = {
     blockId: string;
     type: string;
     label: string;
     category: string;
     description: string;
     template: string;
     script: string;
     defaultProps: Record<string, unknown>;
     isSystem: boolean;
   };
   ```
   - **Status:** Tam match `DynamicPageBlockRecord` ile (ama `createdAt`, `updatedAt`, `tenantId` eksik)
   - **Neden:** Detail/editor sayfası tam yapı görüyor

3. **`modules_next/dynamic_page/dynamic/types.ts:43-54`** (kanonik re-export)
   ```typescript
   export interface DynamicPageBlockRecord {
     blockId: string;
     type: string;
     label: string;
     category: string;
     description?: string | null;
     schema: Record<string, unknown>;
     defaultProps: Record<string, unknown>;
     template: string;
     script?: string | null;
     isSystem: boolean;
   }
   ```
   - **Status:** Zod schema'dan ayrı, TypeScript interface tanımı
   - **Problem:** Zod schema ile senkron değil (nullable fields farklı syntax)

**Önerilen unify:**

```typescript
// blocks/page.tsx - list view için
import type { DynamicPageBlockRecord } from '@/modules/dynamic_page/dynamic_page.types'
type BlockDef = Pick<DynamicPageBlockRecord, 'blockId' | 'type' | 'label' | 'category' | 'isSystem' | 'createdAt'>

// blocks/[blockId]/page.tsx - detail view için
import type { DynamicPageBlockRecord } from '@/modules/dynamic_page/dynamic_page.types'
type BlockDef = DynamicPageBlockRecord

// modules_next/dynamic_page/dynamic/types.ts - REPLACE interface ile import
export type { DynamicPageBlockRecord } from '@/modules/dynamic_page/dynamic_page.types'
// (veya z.infer<typeof DynamicPageBlockRecordSchema> kullan)
```

**Risk:** **Orta** — modules_next/dynamic/types.ts'deki interface tanımı Zod schema'dan farklı. App pages'deki duplikasyon ise hafifsembir Pick<> ile çözülür. Ancak canonical kaynak biraz bulanık.

**Duplikasyon Sıklığı:** 3 yer (2 app page + 1 modules_next interface re-export)

---

### Duplikasyon 2: `DynamicPage` (type)

**Kanon kaynağı:** `modules/dynamic_page/dynamic_page.types.ts:26-39`
```typescript
export const DynamicPageRecordSchema = z.object({
  dynamicPageId: z.string(),
  tenantId: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  keywords: z.array(z.string()).default([]),
  sections: z.array(BlockDataSchema).default([]),
  metadata: PageMetadataSchema,
  status: z.string(),
  schemaVersion: z.number().int().min(1).default(CURRENT_SCHEMA_VERSION),
  createdAt: z.preprocess(...),
  updatedAt: z.preprocess(...),
})
export type DynamicPageRecord = z.infer<typeof DynamicPageRecordSchema>
```

**Duplike yerler:**

1. **`/home/kuray/next-boilerplate/app/tenant/[tenantId]/admin/(tenant-scope)/pages/page.tsx:19`**
   ```typescript
   type DynamicPage = {
     dynamicPageId: string;
     title: string;
     slug: string;
     status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
     updatedAt: string;
   };
   ```
   - **Eksikler:** Çoğu alan (sections, metadata, vb.)
   - **Neden:** Liste view sadece title, slug, status, updatedAt gösteriyor

2. **`/home/kuray/next-boilerplate/app/tenant/[tenantId]/[slug]/page.tsx`** (public renderer)
   - Direct type tanımı YOK — `interfaces Params, Props` ve `BlockData` import kullanıyor (7-8 satır)
   - Kaç olmamış: entity kullanmıyor; API response'u parse ediyor

**Önerilen unify:**

```typescript
// pages/page.tsx - list view
import type { DynamicPageRecord } from '@/modules/dynamic_page/dynamic_page.types'
type DynamicPage = Pick<DynamicPageRecord, 'dynamicPageId' | 'title' | 'slug' | 'status' | 'updatedAt'>

// [slug]/page.tsx - public renderer
// Zaten import ediyor: type BlockData from '@/modules_next/dynamic_page/dynamic/types'
// Hiç type tanımı gerekli değil — DynamicPageService response'u zaten typed
```

**Risk:** **Düşük** — UI list subset; status enum ise `'DRAFT' | 'PUBLISHED' | 'ARCHIVED'` hardcoded, aslında `DynamicPageStatus` enum'dan alınmalı.

**Duplikasyon Sıklığı:** 2 yer (1 admin list + 1 public page — minimal)

---

### Duplikasyon 3: `PageMetadata` (type)

**Kanon kaynağı:** `modules/dynamic_page/dynamic_page.types.ts:15-24`
```typescript
export const PageMetadataSchema = z.object({
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  twitterTitle: z.string().optional(),
  twitterDescription: z.string().optional(),
  twitterCard: z.string().optional(),
  canonical: z.string().optional(),
  robots: z.string().optional(),
}).nullish()

export type PageMetadata = z.infer<typeof PageMetadataSchema>
```

**Duplike yerler:**

1. **`/home/kuray/next-boilerplate/modules_next/dynamic_page/dynamic/Editor/stores/editorStore.ts:20-24`**
   ```typescript
   const DefaultPageMetadata = {
     ogTitle: '', ogDescription: '', ogImage: '',
     twitterTitle: '', twitterDescription: '', twitterCard: '',
     canonical: '', robots: '',
   }
   ```
   - **Status:** Literal object (type inference yok, string literals)
   - **Problem:** Schema'dan farklı — nullish yerine default string values

2. **`/home/kuray/next-boilerplate/modules_next/dynamic_page/dynamic/Editor/SeoModal.tsx:49`**
   ```typescript
   const updateMeta = (key: string, value: string) =>
     setMetadata({ ...meta, [key]: value })
   ```
   - **Status:** Inline — type tanımı yok (Record<string, string>)

3. **`/home/kuray/next-boilerplate/app/tenant/[tenantId]/[slug]/page.tsx:27, 42-43`**
   ```typescript
   const meta = page.metadata as Record<string, string> | undefined
   return {
     title: meta?.ogTitle || title,
     ...
   }
   ```
   - **Status:** Casting'ler; schema'dan farklı

**Önerilen unify:**

```typescript
// editorStore.ts
import type { PageMetadata } from '@/modules/dynamic_page/dynamic_page.types'
const DefaultPageMetadata: PageMetadata = {
  ogTitle: '', ogDescription: '', ogImage: '',
  twitterTitle: '', twitterDescription: '', twitterCard: '',
  canonical: '', robots: '',
}

// [slug]/page.tsx
import type { PageMetadata } from '@/modules/dynamic_page/dynamic_page.types'
const meta = (page.metadata ?? {}) as PageMetadata
```

**Risk:** **Düşük** — Type import'u basit; editor store'daki defaults zaten uygun yapı.

**Duplikasyon Sıklığı:** 3 yer (editor store + seo modal + public page)

---

### Duplikasyon 4: Editor UI State Types (Local — Bilinçli Ayrım)

**Nerede:** `modules_next/dynamic_page/dynamic/Editor/` ve `stores/editorStore.ts`

**Editor-spesifik UI state tipleri (KEEP LOCAL):**

1. **`editorStore.ts:16`** — `type Router`
   - Local ViewModel — render logic için

2. **`editorStore.ts:18`** — `type TranslationEntry`
   ```typescript
   type TranslationEntry = { title: string; description: string; sections: BlockData[] }
   ```
   - Local — translation cache state

3. **`editorStore.ts:26-96`** — `interface EditorStore`
   - Massive Zustand store definition
   - Local — state management; ViewModel pattern

4. **`Canvas.tsx:73-78`** — `interface QuickAddPopoverProps`
   - Local — popover component props

5. **`Canvas.tsx:154-159`** — `interface BlockContextMenuProps`
   - Local — context menu props

6. **`Canvas.tsx:224-228`** — `interface InsertGapProps`
   - Local — drag-drop gap indicator

7. **`Canvas.tsx:270-274`** — `interface SortableBlockProps`
   - Local — dnd-kit integration

8. **`LeftSidebar.tsx:14`** — `type AnyBlockDef`
   ```typescript
   type AnyBlockDef = BlockDefinition | DynamicPageBlockRecord
   ```
   - **Status:** BlockDefinition + DynamicPageBlockRecord union (melez)
   - **Düşün:** Keep local ama DynamicPageBlockRecord import kontrolü yap

9. **`LeftSidebar.tsx:96`** — `interface SortableLayerItemProps`
   - Local — layer item component

10. **`RepeaterField.tsx:12`** — `interface RepeaterFieldProps`
    - Local — repeater field component

11. **`RightSidebar.tsx` — inline onChange type**
    ```typescript
    const onChange = (props: Record<string, unknown>) => { ... }
    ```
    - Local

12. **`PropsPanel.tsx:12`** — `interface Props`
    - Local

13. **`EditorTopBar.tsx:20`** — `interface Props`
    - Local

14. **`migrations/index.ts:11`** — `type MigrationFn`
    - Local — migration function

**Sonuç:** Editor state'i LOCAL TUTMALI. Hiç duplikasyon değil — bu tiplerin server-side karşılığı yoktur.

---

## Eksik Canonical Dosyalar (Yazılması Öneriliyor)

### `modules_next/dynamic_page/dynamic/types.ts` Temizliği

**Durum:** Zod exports mix with interface definitions

```typescript
// ❌ Mevcut (Zod'dan import + interface override)
export type { BlockData } from '@/modules/dynamic_page/dynamic_page.types'
export interface DynamicPageBlockRecord { ... }  // AYRIŞTI!

// ✅ Önerilir
export type { BlockData, DynamicPageBlockRecord } from '@/modules/dynamic_page/dynamic_page.types'
// (interface tanımını sil)
```

**Dosya:** `/home/kuray/next-boilerplate/modules_next/dynamic_page/dynamic/types.ts`

**Eylem:** Interface definition'ı kaldır, Zod import'u kullan.

---

### `modules_next/dynamic_page/dynamic/utils/BlockRegistry.ts`

**Durum:** Block definitions'lar getCodeBlock(type) ile runtime'da lookup — type-safe değil

**Önerilir:** BlockDefinition type checking'i eksik.

---

## Local Kalmalı (Bilinçli Ayrım)

1. **Editor UI state types** (editorStore.ts, Canvas.tsx, LeftSidebar.tsx, vb.)
   - Zustand store, dnd-kit props, modal states
   - Server ile ilişkisi yok

2. **Component-spesifik Props tipleri**
   - BaseBlockProps, QuickAddPopoverProps, BlockContextMenuProps, vb.

3. **Block-spesifik config schemas**
   - `PopupModalBlock/types.ts` — PopupButton, CloseBtnProps, CardProps (block-specific UI state)
   - `CustomBlock.tsx:5-9` — CustomFieldSchema (custom block editor field schema)

4. **Block Registry runtime lookups**
   - BlockRegistry.ts — code block definitions map

---

## API Routes Type Safety

**Durum:** API routes doğru DTO/schema validation kullanıyor ✅

```typescript
// ✅ DOĞRU
app/tenant/[tenantId]/api/dynamic-pages/route.ts
  - GET: ListPagesQuerySchema.parse()
  - POST: CreatePageDTO.parse()

app/tenant/[tenantId]/api/dynamic-pages/[dynamicPageId]/route.ts
  - GET: no DTO needed
  - PATCH: UpdatePageDTO.parse()
  - DELETE: no DTO needed

app/tenant/[tenantId]/api/dynamic-pages/block-definitions/route.ts
  - POST: CreateBlockDTO.parse()
```

**Sonuç:** API routes tamamıyla canonical Zod schemas kullanıyor. Duplikasyon YOK.

---

## Response Type Shapes

**Status:** DTO ve Service return types tutarlı:

- Service.listPages() → `{ items: DynamicPageRecord[], total: number }`
- Service.createPage() → `{ page: DynamicPageRecord }`
- Service.getPage() → `{ page: DynamicPageRecord }`
- Service.listBlocks() → `{ blocks: DynamicPageBlockRecord[] }`
- Service.createBlock() → `{ block: DynamicPageBlockRecord }`

Hiç duplikasyon yok — all return canonical Zod-inferred types.

---

## Özet Tablosu

| Tip | Sayı | Yerler | Severity | Fix |
|-----|------|--------|----------|-----|
| **BlockDef** | 3 | blocks/page.tsx, blocks/[blockId]/page.tsx, dynamic/types.ts | Orta | Pick<> + remove interface |
| **DynamicPage** | 2 | pages/page.tsx, [slug]/page.tsx | Düşük | Pick<> + enum import |
| **PageMetadata** | 3 | editorStore.ts, SeoModal.tsx, [slug]/page.tsx | Düşük | Type import + casting fix |
| **Editor state types** | 14+ | Editor/* | — | **KEEP LOCAL** |
| **Block props types** | 5+ | Blocks/* | — | **KEEP LOCAL** |

**Toplam duplikasyon:** 8 (BlockDef 3 + DynamicPage 2 + PageMetadata 3)
**Toplam bilinçli ayrım:** 20+

---

## Faz Planı

### Faz 1: Kanon Kaynakları Temizle
1. `modules/dynamic_page/dynamic_page.types.ts` — Zod schemas kontrol
2. `modules_next/dynamic_page/dynamic/types.ts` — interface'leri kaldır, imports kullan

**Dosyalar:** 2 dosya, ~15 dakika

### Faz 2: App Pages Unify
1. `app/tenant/[tenantId]/admin/(tenant-scope)/blocks/page.tsx:18` — `Pick<DynamicPageBlockRecord, '...'>`
2. `app/tenant/[tenantId]/admin/(tenant-scope)/blocks/[blockId]/page.tsx:13` — `DynamicPageBlockRecord` import
3. `app/tenant/[tenantId]/admin/(tenant-scope)/pages/page.tsx:19` — `Pick<DynamicPageRecord, '...'>`
4. `app/tenant/[tenantId]/[slug]/page.tsx:27` — `PageMetadata` import + casting

**Dosyalar:** 4 dosya, ~20 dakika

### Faz 3: Editor State Cleanup (Optional)
1. `editorStore.ts:20-24` — `DefaultPageMetadata` type annotate
2. Diğer editor types — documentation sadece

**Dosyalar:** 1 dosya, ~5 dakika

---

## Detaylı Duplikasyon Haritası

```
BlockDef (3 yerde):
├─ app/tenant/[tenantId]/admin/(tenant-scope)/blocks/page.tsx:18-25
├─ app/tenant/[tenantId]/admin/(tenant-scope)/blocks/[blockId]/page.tsx:13-23
└─ modules_next/dynamic_page/dynamic/types.ts:43-54 (interface override)

DynamicPage (2 yerde):
├─ app/tenant/[tenantId]/admin/(tenant-scope)/pages/page.tsx:19-25
└─ [slug]/page.tsx (casting, type tanımı yok)

PageMetadata (3 yerde):
├─ editorStore.ts:20-24 (default object)
├─ [slug]/page.tsx:27 (casting)
└─ SeoModal.tsx:49 (inline Record<string, string>)
```

---

## Kısa Tavsiyeler

1. ✅ **API routes** — Hiç action gerekli, tamamıyla canonical
2. ✅ **Entity definitions** — Temiz, TypeORM entities doğru
3. ✅ **Service layer** — Zod validation doğru, dönen types tutarlı
4. ⚠️ **App pages** — 2 BlockDef, 1 DynamicPage, 1 PageMetadata casting → Pick<> pattern'i ve imports
5. ⚠️ **modules_next/types.ts** — Interface override kaldırılmalı
6. ✅ **Editor state** — Bilinçli ayrım; local kalmalı

---

## Final Status

- **Gerçek duplikasyon:** 8 (3 BlockDef, 2 DynamicPage, 3 PageMetadata)
- **Bilinçli ayrım (local):** 20+ (editor UI state, component props)
- **API/Service cleanliness:** ✅ %100
- **Risk seviyesi:** Düşük (Pick<> pattern'i basit)
- **Estimated fix time:** 30–40 dakika

---

*Rapor tarihi: 2025-05-26*
*Scope: dynamic_page module'ü (9 backend + 37 frontend + 7 app dosya)*
*Method: Regex grep, file read, type inference analysis*
