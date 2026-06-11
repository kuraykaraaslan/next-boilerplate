import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import Logger from '@/modules/logger'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { TaxClass as TaxClassEntity } from './entities/tax_class.entity'
import { TaxRate as TaxRateEntity } from './entities/tax_rate.entity'
import {
  TaxCalculationResultSchema,
  type TaxLine, type TaxCalculationLine, type TaxCalculationResult,
} from './payment_tax.types'
import type { CalculateTaxDTO } from './payment_tax.dto'
import { PAYMENT_TAX_MESSAGES } from './payment_tax.messages'

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function matchesPostalCode(pattern: string, postalCode: string): boolean {
  try {
    return new RegExp(`^${pattern}$`, 'i').test(postalCode)
  } catch {
    return postalCode.toUpperCase().startsWith(pattern.toUpperCase())
  }
}

export default class PaymentTaxCalcService {

  static async calculateTax(tenantId: string, dto: CalculateTaxDTO): Promise<TaxCalculationResult> {
    try {
      return await PaymentTaxCalcService.runCalculation(tenantId, dto)
    } catch (error) {
      Logger.error(`${PAYMENT_TAX_MESSAGES.CALCULATION_FAILED}: ${error}`)
      throw error instanceof AppError ? error : new AppError(PAYMENT_TAX_MESSAGES.CALCULATION_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  private static async runCalculation(tenantId: string, dto: CalculateTaxDTO): Promise<TaxCalculationResult> {
    const ds = await tenantDataSourceFor(tenantId)
    const classRepo = ds.getRepository(TaxClassEntity)
    const rateRepo = ds.getRepository(TaxRateEntity)

    const classes = await classRepo.find({ where: { tenantId } })
    const classByCode = new Map<string, TaxClassEntity>()
    let defaultClass: TaxClassEntity | undefined
    for (const c of classes) {
      classByCode.set(c.code, c)
      if (c.isDefault) defaultClass = c
    }

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
