# Commerce/Content modülleri — Type duplikasyon raporu

## dynamic_page

### Duplikasyon: `DynamicPageBlock`
- **Canonical kaynak:** `modules/dynamic_page/entities/dynamic_page_block.entity.ts:9` — `DynamicPageBlock` (TypeORM @Entity)
  - Alanlar: `blockId`, `type`, `label`, `category`, `description`, `schema`, `defaultProps`, `template`, `script`, `isSystem`, `createdAt`, `updatedAt`
- **Zod schema:** `modules/dynamic_page/dynamic_page.types.ts:53-67` — `DynamicPageBlockRecord` ve `DynamicPageBlockRecordSchema` (doğru) ✅
- **Duplike yerler:**
  - `app/tenant/[tenantId]/admin/(tenant-scope)/blocks/page.tsx:18` — `type BlockDef` (eksik: `description`, `template`, `script`, `defaultProps`)
  - `app/tenant/[tenantId]/admin/(tenant-scope)/blocks/[blockId]/page.tsx:13` — `type BlockDef` (tam match, 11 alan)
- **Önerilen unify:** 
  - `blocks/page.tsx` → `type BlockDef = Pick<DynamicPageBlockRecord, 'blockId' | 'type' | 'label' | 'category' | 'isSystem' | 'createdAt'>`
  - `blocks/[blockId]/page.tsx` → `type BlockDef = DynamicPageBlockRecord` (import etmek daha kolay)
- **Risk:** **Düşük** — Liste vs. detail sayfaları farklı alanlar kullanıyor. Types.ts'deki Zod exports zaten mevcut, sadece app/ imports eklenmeli.

### Duplikasyon: `DynamicPage`
- **Canonical kaynak:** `modules/dynamic_page/entities/dynamic_page.entity.ts:11` — `DynamicPage` (TypeORM @Entity)
  - Alanlar: `dynamicPageId`, `tenantId`, `slug`, `title`, `description`, `keywords`, `sections`, `metadata`, `status`, `schemaVersion`, `createdAt`, `updatedAt`
- **Zod schema:** `modules/dynamic_page/dynamic_page.types.ts:26-39` — `DynamicPageRecord` ve `DynamicPageRecordSchema` ✅
- **Duplike yerler:**
  - `app/tenant/[tenantId]/admin/(tenant-scope)/pages/page.tsx:19` — `type DynamicPage` (subset: `dynamicPageId`, `title`, `slug`, `status`, `updatedAt`)
- **Önerilen unify:**
  - `pages/page.tsx` → `type DynamicPage = Pick<DynamicPageRecord, 'dynamicPageId' | 'title' | 'slug' | 'status' | 'updatedAt'>`
- **Risk:** **Düşük** — UI-only list ekranı; pick ile çözülür.

---

## payment (payment + payment_core + payment_sell + payment_subscription)

### Duplikasyon: `Payment`
- **Canonical kaynak:** `modules/payment/entities/payment.entity.ts:4` — `Payment` (TypeORM @Entity)
  - Alanlar: `paymentId`, `userId`, `tenantId`, `provider`, `providerPaymentId`, `amount`, `currency`, `status`, `paymentMethod`, `description`, `metadata`, `customerEmail`, `customerName`, `customerPhone`, `billingAddress`, `refundedAmount`, `failureCode`, `failureMessage`, `paidAt`, `cancelledAt`, `refundedAt`, `expiresAt`, `createdAt`, `updatedAt`, `deletedAt`
- **Zod schema:** `modules/payment/payment.types.ts:20-47` — `PaymentSchema` ve `SafePaymentSchema` ✅
- **Duplike yerler:**
  - `app/tenant/[tenantId]/admin/(tenant-scope)/payments/page.tsx:14` — `type Payment` (subset: `paymentId`, `amount`, `currency`, `status`, `provider`, `customerEmail`, `customerName`, `createdAt`, `tenantId`, `userId`)
- **Önerilen unify:**
  - `payments/page.tsx` → `type Payment = Pick<SafePayment, 'paymentId' | 'amount' | 'currency' | 'status' | 'provider' | 'customerEmail' | 'customerName' | 'createdAt' | 'tenantId' | 'userId'>`
- **Risk:** **Düşük** — API payload'ı zaten Zod schema'dan geliyor; frontend type'ı sadece display için.

---

## coupon

### Duplikasyon: `Coupon` (ve subscope tipleri)
- **Canonical kaynak:** `modules/coupon/entities/coupon.entity.ts:14` — `Coupon` (TypeORM @Entity)
  - Alanlar: `couponId`, `tenantId`, `code`, `name`, `description`, `discountType`, `discountValue`, `currency`, `scope`, `maxUses`, `maxUsesPerTenant`, `usedCount`, `status`, `startsAt`, `expiresAt`, `createdAt`, `updatedAt`
- **Zod schema:** `modules/coupon/coupon.types.ts:5-22` — `CouponSchema` ✅
- **Duplike yerler:**
  - `app/tenant/[tenantId]/admin/(tenant-scope)/coupons/page.tsx:19` — `type CouponStatus` (enum union)
  - `app/tenant/[tenantId]/admin/(tenant-scope)/coupons/page.tsx:20` — `type DiscountType` (enum union)
  - `app/tenant/[tenantId]/admin/(tenant-scope)/coupons/page.tsx:22-29` — `type CouponScope` (object literal)
  - `app/tenant/[tenantId]/admin/(tenant-scope)/coupons/page.tsx:31-46` — `type Coupon` (entity-close, 14 alan)
  - `app/tenant/[tenantId]/admin/(tenant-scope)/coupons/page.tsx:48-64` — `type CreateForm` (form state, UI-only)
- **Zod enums:** `modules/coupon/coupon.enums.ts` → `DiscountTypeEnum`, `CouponStatusEnum` ✅
- **Önerilen unify:**
  - `coupons/page.tsx` satır 19-20: coupon.enums.ts'ten import et
  - `coupons/page.tsx` satır 22-29: `type CouponScope = Pick<Coupon, 'scope'> | ...` — entity'den al
  - `coupons/page.tsx` satır 31-46: `type Coupon = z.infer<typeof CouponSchema>` (import coupon.types.ts'ten)
  - `coupons/page.tsx` satır 48-64: **Keep local** — form state içeriyor, UI-specific (`scopeProducts`, `scopePlans` ref arrays)
- **Risk:** **Orta** — `CreateForm` ViewModel; unify EDİLMEMELİ. Ancak enum ve schema imports gerekli.

---

## invoice

### Duplikasyon: `InvoiceRow`
- **Canonical kaynak:** `modules/invoice/entities/invoice.entity.ts:10` — `Invoice` (TypeORM @Entity)
  - Alanlar: `invoiceId`, `tenantId`, `invoiceNumber`, `paymentId`, `subscriptionId`, `customerEmail`, `customerName`, `customerTaxId`, `customerAddress`, `customerCountryCode`, `issueDate`, `dueDate`, `paidAt`, `subtotal`, `discountAmount`, `taxAmount`, `totalAmount`, `currency`, `status`, `region`, ...
- **Zod schema:** `modules/invoice/invoice.types.ts:51-80` — `SafeInvoiceSchema` ✅
- **Duplike yerler:**
  - `app/tenant/[tenantId]/admin/(tenant-scope)/invoices/page.tsx:11-21` — `interface InvoiceRow` (display subset: `invoiceId`, `invoiceNumber`, `customerName`, `customerEmail`, `issueDate`, `totalAmount`, `currency`, `status`, `region`)
- **Önerilen unify:**
  - `invoices/page.tsx` → `type InvoiceRow = Pick<SafeInvoice, 'invoiceId' | 'invoiceNumber' | 'customerName' | 'customerEmail' | 'issueDate' | 'totalAmount' | 'currency' | 'status' | 'region'>`
- **Risk:** **Düşük** — Saf list view subset.

---

## seo

### ✅ Temiz
- **Entity:** `modules/seo/entities/seo_meta.entity.ts:6` — `SeoMeta`
- **Zod schema:** `modules/seo/seo.types.ts:4-19` — `SeoMetaSchema` ve `SeoMeta` type
- **Duplikasyon yok:** Türetme/JOIN işlemleri yok, inline tiplendirme yok.

---

## media_gallery

### ✅ Temiz
- **Entity:** `modules/media_gallery/entities/media_gallery_item.entity.ts:21` — `MediaGalleryItem`
- **Zod schemas:** `modules/media_gallery/media_gallery.types.ts` — `MediaGalleryItemSchema`, `MediaGalleryItemViewSchema` (UploadedFile JOIN) ✅
- **Duplikasyon yok:** Admin page yok, API endpoint'ler schema'dan dönüş yapıyor.

---

## store

### ✅ Temiz (kategorilere kadar)
- **Entities:** `modules/store/entities/store_product.entity.ts`, `store_category.entity.ts`, `store_variant_group.entity.ts`, vb.
- **Zod schemas:** `modules/store/store.types.ts` — tüm schemas mevcut ve konsistent
- **Admin pages:** `/admin/(tenant-scope)/store/**` — henüz bulunmuyor (liste yok gibi görünüyor)
- **Duplikasyon:** Tespit edilmiş değil

---

## payment_core, payment_sell, payment_subscription

### ✅ Temiz (entity reuse)
- **payment_core:** utility/base definitions (no entities)
- **payment_sell:** `modules/payment_sell/entities/payment.entity.ts` ve `payment_transaction.entity.ts` — `modules/payment/` ile type share
- **payment_subscription:** `subscription.entity.ts`, `subscription_plan.entity.ts` — `modules/payment/` ile plan share
- **Zod schemas:** `payment_subscription.types.ts`, `payment_sell.types.ts` mevcut
- **Duplikasyon:** Cross-module entity reuse iyi; types doğru namespace'lendi

---

## Özet

| Modül | Duplikasyon Sayısı | Önem | Eylem |
|-------|-------------------|------|-------|
| **dynamic_page** | 2 | Düşük | BlockDef, DynamicPage — Pick<> ile unify |
| **payment** | 1 | Düşük | Payment — Pick<SafePayment, '...'>  |
| **coupon** | 3 enum/object | Orta | Status, DiscountType, Scope — import enum ve schema; CreateForm local tutma |
| **invoice** | 1 | Düşük | InvoiceRow — Pick<SafeInvoice, '...'> |
| **seo** | 0 | — | ✅ Temiz |
| **media_gallery** | 0 | — | ✅ Temiz |
| **store** | 0 | — | ✅ Temiz |
| **payment_core/sell/sub** | 0 | — | ✅ Temiz |

### Toplam Bulgu
- **Toplam duplikasyon:** 7 (4 modüle yayılı)
- **En kirli modül:** dynamic_page (2 × BlockDef definisyon, 2 × page levels)
- **Orta risk:** coupon (enum/object duplikasyon ama CreateForm keep local)
- **Düşük risk:** payment, invoice (display subset, Pick<> ile çözülür)

### Unify Yapma Süreci
1. **payment, invoice, dynamic_page:** Tüm import'ları `modules/<mod>/*.types.ts` (Zod) dan yap
2. **coupon:** Enum'lar → `coupon.enums.ts`; scope schema → `coupon.types.ts`; CreateForm **keep local**
3. **Tüm admin pages:** `// type X = Pick<Entity, '...'>` pattern'i kurala döndür
4. Hiç entity import'u gerekmiyor — Zod `z.infer<>` kullan

---

*Rapor tarihi: 2025-05-26*
*Scope: `dynamic_page`, `seo`, `media_gallery`, `store`, `payment*`, `invoice`, `coupon`*
