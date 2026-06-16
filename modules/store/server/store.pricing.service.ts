import 'reflect-metadata'
import PaymentTaxCalcService from '@nb/payment_tax/server/payment_tax.calc.service'
import type { StoreProduct, StoreProductVariant, StoreCategory } from './store.types'

export interface ResolvedPrice {
  amount: number
  currency: string
  isOnSale: boolean
  originalAmount?: number
}

export interface PriceResolutionOpts {
  /** ISO country of the buyer — selects a per-country override when present. */
  country?: string | null
  /** Preferred display currency — selects from the multi-currency price list. */
  currency?: string | null
  now?: Date
}

/**
 * Pure pricing / inventory / localization resolution for store products.
 * No mocks: every method is deterministic over the product's stored data;
 * tax resolution delegates to the real payment_tax engine.
 */
export default class StorePricingService {

  // ── Pricing ────────────────────────────────────────────────────────────────

  private static saleActive(p: { salePrice?: number | null; saleStartsAt?: Date | null; saleEndsAt?: Date | null }, now: Date): boolean {
    if (p.salePrice == null) return false
    if (p.saleStartsAt && new Date(p.saleStartsAt) > now) return false
    if (p.saleEndsAt && new Date(p.saleEndsAt) < now) return false
    return true
  }

  /**
   * Resolve the effective price for a product honouring, in order:
   *  1. per-country override (`countryPrices[country]`)
   *  2. multi-currency price list (`priceList[currency]`)
   *  3. base price/currency
   * then applies an active time-bounded sale price on top.
   */
  static resolvePrice(product: StoreProduct, opts: PriceResolutionOpts = {}): ResolvedPrice {
    const now = opts.now ?? new Date()
    let amount = product.basePrice
    let currency = product.currency

    const countryKey = opts.country?.toUpperCase()
    const override = countryKey ? product.countryPrices?.[countryKey] : undefined
    if (override) {
      amount = override.amount
      currency = override.currency
    } else if (opts.currency && product.priceList && product.priceList[opts.currency] != null) {
      amount = product.priceList[opts.currency]
      currency = opts.currency
    }

    // Sale price applies only when the resolved currency matches the base
    // currency (sale prices are authored against the base, not overrides).
    if (currency === product.currency && this.saleActive(product, now)) {
      return { amount: product.salePrice as number, currency, isOnSale: true, originalAmount: amount }
    }
    return { amount, currency, isOnSale: false }
  }

  /** Resolve the effective price for a specific variant (variant sale wins). */
  static resolveVariantPrice(product: StoreProduct, variant: StoreProductVariant, opts: PriceResolutionOpts = {}): ResolvedPrice {
    const now = opts.now ?? new Date()
    const base = this.resolvePrice(product, opts)
    const variantBase = variant.price != null ? variant.price : base.amount
    if (this.saleActive(variant, now)) {
      return { amount: variant.salePrice as number, currency: base.currency, isOnSale: true, originalAmount: variantBase }
    }
    return { amount: variantBase, currency: base.currency, isOnSale: base.isOnSale, originalAmount: base.originalAmount }
  }

  /**
   * Compute tax for a resolved product price via the payment_tax engine.
   * Returns the net/tax/gross figures from the canonical tax calculator.
   */
  static async priceWithTax(
    tenantId: string,
    product: StoreProduct,
    opts: PriceResolutionOpts & { quantity?: number } = {},
  ) {
    const price = this.resolvePrice(product, opts)
    const result = await PaymentTaxCalcService.calculateTax(tenantId, {
      currency: price.currency,
      destination: { countryCode: opts.country ?? undefined },
      lines: [{
        reference: product.productId,
        amount: price.amount,
        quantity: opts.quantity ?? 1,
        taxClassCode: product.taxClass ?? undefined,
      }],
    })
    return { price, tax: result }
  }

  // ── Availability ─────────────────────────────────────────────────────────

  /** True when the product may be sold/shown to a buyer in `country`. */
  static isAvailableIn(product: StoreProduct, country: string | null | undefined): boolean {
    if (!country) return true
    const cc = country.toUpperCase()
    if (product.restrictedCountries?.some((c) => c.toUpperCase() === cc)) return false
    if (product.availableCountries && product.availableCountries.length > 0) {
      return product.availableCountries.some((c) => c.toUpperCase() === cc)
    }
    return true
  }

  // ── Inventory ──────────────────────────────────────────────────────────────

  /** Total stock across all warehouses (falls back to flat stockQuantity). */
  static totalStock(item: { warehouseStock?: Record<string, number> | null; stockQuantity?: number | null }): number {
    if (item.warehouseStock && Object.keys(item.warehouseStock).length > 0) {
      return Object.values(item.warehouseStock).reduce((a, b) => a + (Number(b) || 0), 0)
    }
    return item.stockQuantity ?? 0
  }

  /** Stock for a specific warehouse code. */
  static stockForWarehouse(item: { warehouseStock?: Record<string, number> | null }, warehouseCode: string): number {
    return item.warehouseStock?.[warehouseCode] ?? 0
  }

  // ── Localization ─────────────────────────────────────────────────────────

  /** Localized product content with fallback to the base fields. */
  static localizeProduct(product: StoreProduct, locale?: string): { name: string; shortDescription: string | null; details: string | null } {
    const t = locale ? product.translations?.[locale] : undefined
    return {
      name: t?.name ?? product.name,
      shortDescription: t?.shortDescription ?? product.shortDescription ?? null,
      details: t?.details ?? product.details ?? null,
    }
  }

  /** Localized category content with fallback to the base fields. */
  static localizeCategory(category: StoreCategory, locale?: string): { name: string; description: string | null } {
    const t = locale ? category.translations?.[locale] : undefined
    return {
      name: t?.name ?? category.name,
      description: t?.description ?? category.description ?? null,
    }
  }
}
