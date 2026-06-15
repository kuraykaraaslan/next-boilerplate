import 'reflect-metadata'
import { z } from 'zod'
import Logger from '@/modules/logger'
import AuditLogService from '@/modules/audit_log/audit_log.service'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { TaxClass as TaxClassEntity } from './entities/tax_class.entity'
import { getTaxRuleData } from './payment_tax.cache'
import {
  TaxCalculationResultSchema,
  type TaxLine, type TaxCalculationLine, type TaxCalculationResult,
} from './payment_tax.types'
import { CalculateTaxDTO } from './payment_tax.dto'
import { PAYMENT_TAX_MESSAGES } from './payment_tax.messages'
import { roundMoney, type RoundingMode } from './payment_tax.rounding'

function matchesPostalCode(pattern: string, postalCode: string): boolean {
  try {
    return new RegExp(`^${pattern}$`, 'i').test(postalCode)
  } catch {
    return postalCode.toUpperCase().startsWith(pattern.toUpperCase())
  }
}

export default class PaymentTaxCalcService {

  static async calculateTax(tenantId: string, dtoIn: z.input<typeof CalculateTaxDTO>): Promise<TaxCalculationResult> {
    try {
      // Parse to apply defaults (rounding mode/level, exempt, …) so direct
      // callers (invoice, checkout) don't have to supply every policy field.
      const dto = CalculateTaxDTO.parse(dtoIn)
      const result = await PaymentTaxCalcService.runCalculation(tenantId, dto)
      // Tax calculation audit trail (best-effort) — a record of what was charged
      // and why, for compliance reviews and dispute resolution.
      AuditLogService.log({
        tenantId, actorType: 'SYSTEM', action: 'tax.calculated',
        resourceType: 'tax_calculation', resourceId: null,
        metadata: {
          currency: result.currency, subtotalNet: result.subtotalNet, totalTax: result.totalTax,
          appliedRates: result.appliedRates, exempt: result.exempt, reverseCharge: result.reverseCharge,
          destination: dto.destination, roundingMode: result.roundingMode, roundingLevel: result.roundingLevel,
        },
      }).catch(() => {})
      return result
    } catch (error) {
      Logger.error(`${PAYMENT_TAX_MESSAGES.CALCULATION_FAILED}: ${error}`)
      throw error instanceof AppError ? error : new AppError(PAYMENT_TAX_MESSAGES.CALCULATION_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  private static async runCalculation(tenantId: string, dto: CalculateTaxDTO): Promise<TaxCalculationResult> {
    const currency = dto.currency
    const mode = dto.roundingMode as RoundingMode
    const r = (v: number) => roundMoney(v, currency, mode)

    // ── Zero-rated paths: exemption or B2B reverse charge ────────────────────
    // No tax is charged; we still echo net = gross per line for the document.
    if (dto.exempt || dto.reverseCharge) {
      const reason = dto.exempt
        ? (dto.exemptionReason || 'Customer tax-exempt')
        : 'Intra-EU B2B reverse charge (Art. 196 VAT Directive)'
      let net = 0
      const lines: TaxCalculationLine[] = dto.lines.map((input) => {
        const amount = r(input.amount * input.quantity)
        net += amount
        return { reference: input.reference, taxClassCode: input.taxClassCode ?? null, netAmount: amount, taxAmount: 0, grossAmount: amount, taxes: [] }
      })
      net = r(net)
      return TaxCalculationResultSchema.parse({
        currency, subtotalNet: net, totalTax: 0, totalGross: net, lines, appliedRates: 0,
        exempt: dto.exempt, reverseCharge: dto.reverseCharge, zeroRatedReason: reason,
        roundingMode: dto.roundingMode, roundingLevel: dto.roundingLevel,
      })
    }

    // Tax classes + active rates from the per-tenant read-through cache.
    const { classes, rates } = await getTaxRuleData(tenantId)
    const classByCode = new Map<string, TaxClassEntity>()
    let defaultClass: TaxClassEntity | undefined
    for (const c of classes) {
      classByCode.set(c.code, c)
      if (c.isDefault) defaultClass = c
    }

    const at = dto.at ?? new Date()
    const allRates = rates.filter((rate) => {
      // Effective-dating: only rates whose window contains `at` apply.
      if (rate.effectiveFrom && new Date(rate.effectiveFrom) > at) return false
      if (rate.effectiveTo && new Date(rate.effectiveTo) < at) return false
      return true
    })

    const dest = dto.destination
    const orderLevel = dto.roundingLevel === 'order'
    let appliedRates = 0
    const resultLines: TaxCalculationLine[] = []
    // Unrounded accumulators for order-level rounding.
    let rawNet = 0
    let rawTax = 0

    for (const input of dto.lines) {
      const resolvedClass = input.taxClassCode ? classByCode.get(input.taxClassCode) : defaultClass
      const resolvedClassId = resolvedClass?.taxClassId ?? null
      const resolvedClassCode = resolvedClass?.code ?? input.taxClassCode ?? null

      const matching = allRates.filter((rate) => {
        if (rate.taxClassId != null && rate.taxClassId !== resolvedClassId) return false
        if (rate.countryCode != null && rate.countryCode !== dest.countryCode) return false
        if (rate.region != null && rate.region !== dest.region) return false
        if (rate.postalCodePattern != null) {
          if (!dest.postalCode) return false
          if (!matchesPostalCode(rate.postalCodePattern, dest.postalCode)) return false
        }
        return true
      })

      const rawAmount = input.amount * input.quantity
      const taxes: TaxLine[] = []
      let lineNet = rawAmount
      let priorTaxSum = 0

      for (const rate of matching) {
        const ratePct = Number(rate.rate)
        let taxableAmount: number
        let taxAmount: number

        if (rate.includedInPrice) {
          const gross = rate.isCompound ? rawAmount + priorTaxSum : rawAmount
          const net = gross / (1 + ratePct / 100)
          taxAmount = gross - net
          taxableAmount = net
          lineNet -= taxAmount
        } else {
          const base = rate.isCompound ? rawAmount + priorTaxSum : rawAmount
          taxableAmount = base
          taxAmount = base * (ratePct / 100)
        }

        // Per-line rounding rounds each tax now; order-level keeps full precision
        // and rounds only the totals at the end.
        const taxAmountOut = orderLevel ? taxAmount : r(taxAmount)
        priorTaxSum += taxAmountOut

        taxes.push({
          taxRateId: rate.taxRateId,
          name: rate.name,
          rate: ratePct,
          taxableAmount: r(taxableAmount),
          taxAmount: r(taxAmountOut),
          isCompound: rate.isCompound,
        })
        appliedRates += 1
      }

      const netAmount = r(lineNet)
      const lineTax = orderLevel ? priorTaxSum : r(priorTaxSum)
      const grossAmount = r(lineNet + priorTaxSum)

      resultLines.push({
        reference: input.reference,
        taxClassCode: resolvedClassCode,
        netAmount,
        taxAmount: r(lineTax),
        grossAmount,
        taxes,
      })

      rawNet += lineNet
      rawTax += priorTaxSum
    }

    // Totals: order-level rounds the summed raw figures once (authoritative
    // total, avoids per-line rounding drift); line-level sums the rounded lines.
    const subtotalNet = orderLevel ? r(rawNet) : r(resultLines.reduce((s, l) => s + l.netAmount, 0))
    const totalTax = orderLevel ? r(rawTax) : r(resultLines.reduce((s, l) => s + l.taxAmount, 0))
    const totalGross = r(subtotalNet + totalTax)

    return TaxCalculationResultSchema.parse({
      currency,
      subtotalNet,
      totalTax,
      totalGross,
      lines: resultLines,
      appliedRates,
      exempt: false,
      reverseCharge: false,
      zeroRatedReason: null,
      roundingMode: dto.roundingMode,
      roundingLevel: dto.roundingLevel,
    })
  }
}
