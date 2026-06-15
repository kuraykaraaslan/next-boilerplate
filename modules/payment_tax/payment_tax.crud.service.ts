import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { TaxClass as TaxClassEntity } from './entities/tax_class.entity'
import { TaxRate as TaxRateEntity } from './entities/tax_rate.entity'
import {
  SafeTaxClassSchema, TaxRateSchema,
  type SafeTaxClass, type TaxRate,
} from './payment_tax.types'
import type {
  CreateTaxClassDTO, UpdateTaxClassDTO,
  CreateTaxRateDTO, UpdateTaxRateDTO, GetTaxRatesQuery,
} from './payment_tax.dto'
import { PAYMENT_TAX_MESSAGES } from './payment_tax.messages'
import { clearTaxRuleCache } from './payment_tax.cache'

export default class PaymentTaxCrudService {

  // ──────────────────────────────────────────────
  // Tax Classes
  // ──────────────────────────────────────────────

  static async createClass(tenantId: string, dto: CreateTaxClassDTO): Promise<SafeTaxClass> {
    const ds = await tenantDataSourceFor(tenantId)
    const saved = await ds.transaction(async (mgr) => {
      const repo = mgr.getRepository(TaxClassEntity)
      if (dto.isDefault) {
        await repo.update({ tenantId, isDefault: true }, { isDefault: false })
      }
      const entity = repo.create({
        tenantId, name: dto.name, code: dto.code,
        description: dto.description, isDefault: dto.isDefault,
      })
      return repo.save(entity)
    })
    await clearTaxRuleCache(tenantId)
    return SafeTaxClassSchema.parse(saved)
  }

  static async updateClass(tenantId: string, classId: string, dto: UpdateTaxClassDTO): Promise<SafeTaxClass> {
    const ds = await tenantDataSourceFor(tenantId)
    const saved = await ds.transaction(async (mgr) => {
      const repo = mgr.getRepository(TaxClassEntity)
      const row = await repo.findOne({ where: { tenantId, taxClassId: classId } })
      if (!row) throw new AppError(PAYMENT_TAX_MESSAGES.TAX_CLASS_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
      if (dto.isDefault === true) {
        await repo.update({ tenantId, isDefault: true }, { isDefault: false })
      }
      Object.assign(row, dto)
      return repo.save(row)
    })
    await clearTaxRuleCache(tenantId)
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
    await clearTaxRuleCache(tenantId)
  }

  // ──────────────────────────────────────────────
  // Tax Rates
  // ──────────────────────────────────────────────

  static async createRate(tenantId: string, dto: CreateTaxRateDTO): Promise<TaxRate> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(TaxRateEntity)
    const entity = repo.create({
      tenantId, taxClassId: dto.taxClassId, name: dto.name,
      countryCode: dto.countryCode, region: dto.region,
      postalCodePattern: dto.postalCodePattern, rate: dto.rate,
      isCompound: dto.isCompound, includedInPrice: dto.includedInPrice,
      priority: dto.priority, isActive: dto.isActive,
    })
    const saved = await repo.save(entity)
    await clearTaxRuleCache(tenantId)
    return TaxRateSchema.parse(saved)
  }

  static async updateRate(tenantId: string, rateId: string, dto: UpdateTaxRateDTO): Promise<TaxRate> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(TaxRateEntity)
    const row = await repo.findOne({ where: { tenantId, taxRateId: rateId } })
    if (!row) throw new AppError(PAYMENT_TAX_MESSAGES.TAX_RATE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, dto)
    const saved = await repo.save(row)
    await clearTaxRuleCache(tenantId)
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
    await clearTaxRuleCache(tenantId)
  }
}
