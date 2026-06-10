import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import Logger from '@/modules/logger'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { TaxClass as TaxClassEntity } from './entities/tax_class.entity'
import { TaxRate as TaxRateEntity } from './entities/tax_rate.entity'
import {
  SafeTaxClassSchema, TaxRateSchema,
  TaxCalculationResultSchema,
  type SafeTaxClass, type TaxRate,
  type TaxLine, type TaxCalculationLine, type TaxCalculationResult,
} from './payment_tax.types'
import type {
  CreateTaxClassDTO, UpdateTaxClassDTO,
  CreateTaxRateDTO, UpdateTaxRateDTO, GetTaxRatesQuery,
  CalculateTaxDTO,
} from './payment_tax.dto'
import { PAYMENT_TAX_MESSAGES } from './payment_tax.messages'

/** Round a monetary value to 2 decimal places (half-up via Number rounding). */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export default class PaymentTaxService {

  // ============================================================================
  // Tax Classes
  // ============================================================================

  static async createClass(tenantId: string, dto: CreateTaxClassDTO): Promise<SafeTaxClass> {
    const ds = await tenantDataSourceFor(tenantId)
    const saved = await ds.transaction(async (mgr) => {
      const repo = mgr.getRepository(TaxClassEntity)
      // Only one default class per tenant — unset any prior default first.
      if (dto.isDefault) {
        await repo.update({ tenantId, isDefault: true }, { isDefault: false })
      }
      const entity = repo.create({
        tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isDefault: dto.isDefault,
      })
      return repo.save(entity)
    })
    return SafeTaxClassSchema.parse(saved)
  }

  static async updateClass(tenantId: string, classId: string, dto: UpdateTaxClassDTO): Promise<SafeTaxClass> {
    const ds = await tenantDataSourceFor(tenantId)
    const saved = await ds.transaction(async (mgr) => {
      const repo = mgr.getRepository(TaxClassEntity)
      const row = await repo.findOne({ where: { tenantId, taxClassId: classId } })
      if (!row) throw new AppError(PAYMENT_TAX_MESSAGES.TAX_CLASS_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
      // Promoting this class to default demotes the others.
      if (dto.isDefault === true) {
        await repo.update({ tenantId, isDefault: true }, { isDefault: false })
      }
      Object.assign(row, dto)
      return repo.save(row)
    })
    return SafeTaxClassSchema.parse(saved)
  }

  static async listClasses(tenantId: string): Promise<SafeTaxClass[]> {
    const ds = await tenantDataSourceFor(tenantId)
    const rows = await ds.getRepository(TaxClassEntity).find({
      where: { tenantId },
      order: { isDefault: 'DESC', name: 'ASC' },
    })
    return rows.map((r) => SafeTaxClassSchema.parse(r))
  }

  static async deleteClass(tenantId: string, classId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(TaxClassEntity)
    const row = await repo.findOne({ where: { tenantId, taxClassId: classId } })
    if (!row) throw new AppError(PAYMENT_TAX_MESSAGES.TAX_CLASS_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }

  // ============================================================================
  // Tax Rates
  // ============================================================================

  static async createRate(tenantId: string, dto: CreateTaxRateDTO): Promise<TaxRate> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(TaxRateEntity)
    const entity = repo.create({
      tenantId,
      taxClassId: dto.taxClassId,
      name: dto.name,
      countryCode: dto.countryCode,
      region: dto.region,
      postalCodePattern: dto.postalCodePattern,
      rate: dto.rate,
      isCompound: dto.isCompound,
      includedInPrice: dto.includedInPrice,
      priority: dto.priority,
      isActive: dto.isActive,
    })
    const saved = await repo.save(entity)
    return TaxRateSchema.parse(saved)
  }

  static async updateRate(tenantId: string, rateId: string, dto: UpdateTaxRateDTO): Promise<TaxRate> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(TaxRateEntity)
    const row = await repo.findOne({ where: { tenantId, taxRateId: rateId } })
    if (!row) throw new AppError(PAYMENT_TAX_MESSAGES.TAX_RATE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    Object.assign(row, dto)
    const saved = await repo.save(row)
    return TaxRateSchema.parse(saved)
  }

  static async getRate(tenantId: string, rateId: string): Promise<TaxRate> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(TaxRateEntity).findOne({ where: { tenantId, taxRateId: rateId } })
    if (!row) throw new AppError(PAYMENT_TAX_MESSAGES.TAX_RATE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return TaxRateSchema.parse(row)
  }

  static async listRates(tenantId: string, query: GetTaxRatesQuery): Promise<{ data: TaxRate[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(TaxRateEntity)
    const where: Record<string, unknown> = { tenantId }
    if (query.countryCode) where['countryCode'] = query.countryCode
    if (query.taxClassId) where['taxClassId'] = query.taxClassId
    if (query.isActive !== undefined) where['isActive'] = query.isActive

    const [rows, total] = await repo.findAndCount({
      where,
      order: { priority: 'ASC', createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => TaxRateSchema.parse(r)), total }
  }

  static async deleteRate(tenantId: string, rateId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(TaxRateEntity)
    const row = await repo.findOne({ where: { tenantId, taxRateId: rateId } })
    if (!row) throw new AppError(PAYMENT_TAX_MESSAGES.TAX_RATE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
  }

  // ============================================================================
  // Tax Calculation — the core engine
  // ============================================================================
  //
  // For each input line we:
  //   1. Resolve the line's tax class by `taxClassCode` (falling back to the
  //      tenant's default class when the line omits a code).
  //   2. Select the active tax rates that match the destination AND the resolved
  //      class. A rate matches the destination when:
  //        - rate.countryCode is null OR equals destination.countryCode
  //        - rate.region is null OR equals destination.region
  //        - rate.postalCodePattern is null OR matches destination.postalCode
  //      A rate matches the class when:
  //        - rate.taxClassId is null (applies to all classes) OR equals the
  //          resolved class id.
  //   3. Order the matching rates by `priority` ascending (lower applies first).
  //
  // Per line we then compute:
  //      lineNet = amount * quantity        (for tax-EXCLUSIVE pricing)
  //   Non-compound rate tax  = base       * rate%      where base = lineNet
  //   Compound     rate tax  = (lineNet + Σ prior taxes on this line) * rate%
  //
  // Inclusive pricing (`includedInPrice = true`): the supplied amount is treated
  // as GROSS for that rate. We back out the net the rate was charged on:
  //      net      = gross / (1 + rate/100)
  //      taxAmount = gross - net
  //   When a line has any inclusive rate, the line's net is reduced accordingly
  //   so totals stay consistent (gross == net + tax).
  //
  // All monetary outputs are rounded to 2 decimals via round2().
  // ============================================================================

  static async calculateTax(tenantId: string, dto: CalculateTaxDTO): Promise<TaxCalculationResult> {
    try {
      return await PaymentTaxService.runCalculation(tenantId, dto)
    } catch (error) {
      Logger.error(`${PAYMENT_TAX_MESSAGES.CALCULATION_FAILED}: ${error}`)
      throw error instanceof AppError ? error : new AppError(PAYMENT_TAX_MESSAGES.CALCULATION_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  private static async runCalculation(tenantId: string, dto: CalculateTaxDTO): Promise<TaxCalculationResult> {
    const ds = await tenantDataSourceFor(tenantId)
    const classRepo = ds.getRepository(TaxClassEntity)
    const rateRepo = ds.getRepository(TaxRateEntity)

    // Load all tax classes once and index them by code for O(1) lookup.
    const classes = await classRepo.find({ where: { tenantId } })
    const classByCode = new Map<string, TaxClassEntity>()
    let defaultClass: TaxClassEntity | undefined
    for (const c of classes) {
      classByCode.set(c.code, c)
      if (c.isDefault) defaultClass = c
    }

    // Load all active rates for this tenant once; we filter in-memory per line.
    const allRates = await rateRepo.find({
      where: { tenantId, isActive: true },
      order: { priority: 'ASC', createdAt: 'ASC' },
    })

    const dest = dto.destination
    let appliedRates = 0
    let subtotalNet = 0
    let totalTax = 0
    let totalGross = 0
    const resultLines: TaxCalculationLine[] = []

    for (const input of dto.lines) {
      // 1. Resolve the line's tax class.
      const resolvedClass = input.taxClassCode
        ? classByCode.get(input.taxClassCode)
        : defaultClass
      const resolvedClassId = resolvedClass?.taxClassId ?? null
      const resolvedClassCode = resolvedClass?.code ?? input.taxClassCode ?? null

      // 2. Select matching rates for this line.
      const matching = allRates.filter((rate) => {
        // Class match: rate is global (null) or targets the resolved class.
        if (rate.taxClassId != null && rate.taxClassId !== resolvedClassId) return false
        // Country match.
        if (rate.countryCode != null && rate.countryCode !== dest.countryCode) return false
        // Region match.
        if (rate.region != null && rate.region !== dest.region) return false
        // Postal-code match (prefix OR regex). Empty destination postal fails a set pattern.
        if (rate.postalCodePattern != null) {
          if (!dest.postalCode) return false
          if (!matchesPostalCode(rate.postalCodePattern, dest.postalCode)) return false
        }
        return true
      })

      // 3. Already ordered by priority asc from the query; keep stable order.
      const orderedRates = matching

      // ----- Per-line computation -----
      const rawAmount = input.amount * input.quantity
      const taxes: TaxLine[] = []

      // `lineNet` is the tax-exclusive base for the line. For inclusive rates we
      // back the net out below, so we start from the raw amount and subtract the
      // tax portion that was already baked into the price.
      let lineNet = rawAmount
      let priorTaxSum = 0 // sum of taxes accumulated on this line (for compounding)

      for (const rate of orderedRates) {
        const ratePct = Number(rate.rate)
        let taxableAmount: number
        let taxAmount: number

        if (rate.includedInPrice) {
          // Inclusive: treat the relevant base as GROSS and back out the net.
          // The gross we charge tax on is (raw + prior compounded taxes) when
          // compound, else the raw amount.
          const gross = rate.isCompound ? rawAmount + priorTaxSum : rawAmount
          const net = gross / (1 + ratePct / 100)
          taxAmount = gross - net
          taxableAmount = net
          // The baked-in tax reduces the line's true net.
          lineNet -= taxAmount
        } else {
          // Exclusive: tax is added on top.
          const base = rate.isCompound ? rawAmount + priorTaxSum : rawAmount
          taxableAmount = base
          taxAmount = base * (ratePct / 100)
        }

        taxAmount = round2(taxAmount)
        priorTaxSum += taxAmount

        taxes.push({
          taxRateId: rate.taxRateId,
          name: rate.name,
          rate: ratePct,
          taxableAmount: round2(taxableAmount),
          taxAmount,
          isCompound: rate.isCompound,
        })
        appliedRates += 1
      }

      const netAmount = round2(lineNet)
      const lineTax = round2(priorTaxSum)
      const grossAmount = round2(netAmount + lineTax)

      resultLines.push({
        reference: input.reference,
        taxClassCode: resolvedClassCode,
        netAmount,
        taxAmount: lineTax,
        grossAmount,
        taxes,
      })

      subtotalNet += netAmount
      totalTax += lineTax
      totalGross += grossAmount
    }

    return TaxCalculationResultSchema.parse({
      currency: dto.currency,
      subtotalNet: round2(subtotalNet),
      totalTax: round2(totalTax),
      totalGross: round2(totalGross),
      lines: resultLines,
      appliedRates,
    })
  }
}

/**
 * Match a destination postal code against a stored pattern.
 * The pattern is treated as a full-string regex; if it is not a valid regex it
 * falls back to a case-insensitive prefix match.
 */
function matchesPostalCode(pattern: string, postalCode: string): boolean {
  try {
    return new RegExp(`^${pattern}$`, 'i').test(postalCode)
  } catch {
    return postalCode.toUpperCase().startsWith(pattern.toUpperCase())
  }
}
