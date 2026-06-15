import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import AuditLogService from '@/modules/audit_log/audit_log.service'
import { ShippingMethod as ShippingMethodEntity } from './entities/shipping_method.entity'
import { ShippingRate as ShippingRateEntity } from './entities/shipping_rate.entity'
import {
  SafeShippingMethodSchema, ShippingRateSchema, ShippingMethodWithRatesSchema,
  type SafeShippingMethod, type ShippingRate, type ShippingMethodWithRates,
} from './payment_shipping.types'
import type {
  CreateShippingMethodDTO, UpdateShippingMethodDTO, GetShippingMethodsQuery,
  CreateShippingRateDTO, UpdateShippingRateDTO,
} from './payment_shipping.dto'
import { PAYMENT_SHIPPING_MESSAGES } from './payment_shipping.messages'
import { clearShippingRuleCache } from './payment_shipping.cache'

export default class PaymentShippingCrudService {

  // ──────────────────────────────────────────────
  // Shipping Methods
  // ──────────────────────────────────────────────

  static async createMethod(tenantId: string, dto: CreateShippingMethodDTO): Promise<SafeShippingMethod> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ShippingMethodEntity)
    const existing = await repo.findOne({ where: { tenantId, code: dto.code } })
    if (existing) throw new AppError(PAYMENT_SHIPPING_MESSAGES.METHOD_CODE_TAKEN, 409, ErrorCode.CONFLICT)
    const method = repo.create({ ...dto, tenantId })
    const saved = await repo.save(method)
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'shipping_method.created',
      resourceType: 'shipping_method', resourceId: saved.shippingMethodId,
      metadata: { code: dto.code },
    }).catch(() => {})
    await clearShippingRuleCache(tenantId)
    return SafeShippingMethodSchema.parse(saved)
  }

  static async updateMethod(tenantId: string, methodId: string, dto: UpdateShippingMethodDTO): Promise<SafeShippingMethod> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ShippingMethodEntity)
    const row = await repo.findOne({ where: { tenantId, shippingMethodId: methodId } })
    if (!row) throw new AppError(PAYMENT_SHIPPING_MESSAGES.METHOD_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (dto.code && dto.code !== row.code) {
      const clash = await repo.findOne({ where: { tenantId, code: dto.code } })
      if (clash) throw new AppError(PAYMENT_SHIPPING_MESSAGES.METHOD_CODE_TAKEN, 409, ErrorCode.CONFLICT)
    }
    if (dto.name !== undefined) row.name = dto.name
    if (dto.code !== undefined) row.code = dto.code
    if (dto.carrier !== undefined) row.carrier = dto.carrier
    if (dto.isActive !== undefined) row.isActive = dto.isActive
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder
    if (dto.description !== undefined) row.description = dto.description
    if (dto.metadata !== undefined) row.metadata = dto.metadata
    const saved = await repo.save(row)
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'shipping_method.updated',
      resourceType: 'shipping_method', resourceId: methodId,
    }).catch(() => {})
    await clearShippingRuleCache(tenantId)
    return SafeShippingMethodSchema.parse(saved)
  }

  static async getMethod(tenantId: string, methodId: string): Promise<ShippingMethodWithRates> {
    const ds = await tenantDataSourceFor(tenantId)
    const method = await ds.getRepository(ShippingMethodEntity).findOne({
      where: { tenantId, shippingMethodId: methodId },
    })
    if (!method) throw new AppError(PAYMENT_SHIPPING_MESSAGES.METHOD_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const rates = await ds.getRepository(ShippingRateEntity).find({
      where: { tenantId, shippingMethodId: methodId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    })
    return ShippingMethodWithRatesSchema.parse({ ...method, rates })
  }

  static async listMethods(tenantId: string, query: GetShippingMethodsQuery): Promise<{ data: SafeShippingMethod[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ShippingMethodEntity)
    const where: Record<string, unknown> = { tenantId }
    if (query.isActive !== undefined) where['isActive'] = query.isActive
    if (query.carrier) where['carrier'] = query.carrier
    const [rows, total] = await repo.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => SafeShippingMethodSchema.parse(r)), total }
  }

  static async deleteMethod(tenantId: string, methodId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ShippingMethodEntity)
    const row = await repo.findOne({ where: { tenantId, shippingMethodId: methodId } })
    if (!row) throw new AppError(PAYMENT_SHIPPING_MESSAGES.METHOD_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
    await clearShippingRuleCache(tenantId)
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'shipping_method.deleted',
      resourceType: 'shipping_method', resourceId: methodId,
    }).catch(() => {})
  }

  // ──────────────────────────────────────────────
  // Shipping Rates
  // ──────────────────────────────────────────────

  static async createRate(tenantId: string, dto: CreateShippingRateDTO): Promise<ShippingRate> {
    const ds = await tenantDataSourceFor(tenantId)
    const method = await ds.getRepository(ShippingMethodEntity).findOne({
      where: { tenantId, shippingMethodId: dto.shippingMethodId },
    })
    if (!method) throw new AppError(PAYMENT_SHIPPING_MESSAGES.METHOD_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    PaymentShippingCrudService.assertRanges(dto.minWeight, dto.maxWeight, dto.minSubtotal, dto.maxSubtotal)
    const repo = ds.getRepository(ShippingRateEntity)
    const rate = repo.create({ ...dto, tenantId })
    const saved = await repo.save(rate)
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'shipping_rate.created',
      resourceType: 'shipping_rate', resourceId: saved.shippingRateId,
      metadata: { shippingMethodId: dto.shippingMethodId },
    }).catch(() => {})
    await clearShippingRuleCache(tenantId)
    return ShippingRateSchema.parse(saved)
  }

  static async updateRate(tenantId: string, rateId: string, dto: UpdateShippingRateDTO): Promise<ShippingRate> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ShippingRateEntity)
    const row = await repo.findOne({ where: { tenantId, shippingRateId: rateId } })
    if (!row) throw new AppError(PAYMENT_SHIPPING_MESSAGES.RATE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    PaymentShippingCrudService.assertRanges(
      dto.minWeight ?? row.minWeight, dto.maxWeight ?? row.maxWeight,
      dto.minSubtotal ?? row.minSubtotal, dto.maxSubtotal ?? row.maxSubtotal,
    )
    if (dto.name !== undefined) row.name = dto.name
    if (dto.price !== undefined) row.price = dto.price
    if (dto.currency !== undefined) row.currency = dto.currency
    if (dto.isActive !== undefined) row.isActive = dto.isActive
    if (dto.countryCode !== undefined) row.countryCode = dto.countryCode
    if (dto.region !== undefined) row.region = dto.region
    if (dto.minWeight !== undefined) row.minWeight = dto.minWeight
    if (dto.maxWeight !== undefined) row.maxWeight = dto.maxWeight
    if (dto.minSubtotal !== undefined) row.minSubtotal = dto.minSubtotal
    if (dto.maxSubtotal !== undefined) row.maxSubtotal = dto.maxSubtotal
    if (dto.freeThreshold !== undefined) row.freeThreshold = dto.freeThreshold
    if (dto.estimatedDaysMin !== undefined) row.estimatedDaysMin = dto.estimatedDaysMin
    if (dto.estimatedDaysMax !== undefined) row.estimatedDaysMax = dto.estimatedDaysMax
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder
    const saved = await repo.save(row)
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'shipping_rate.updated',
      resourceType: 'shipping_rate', resourceId: rateId,
    }).catch(() => {})
    await clearShippingRuleCache(tenantId)
    return ShippingRateSchema.parse(saved)
  }

  static async deleteRate(tenantId: string, rateId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ShippingRateEntity)
    const row = await repo.findOne({ where: { tenantId, shippingRateId: rateId } })
    if (!row) throw new AppError(PAYMENT_SHIPPING_MESSAGES.RATE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const methodId = row.shippingMethodId
    await repo.remove(row)
    await clearShippingRuleCache(tenantId)
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'shipping_rate.deleted',
      resourceType: 'shipping_rate', resourceId: rateId,
      metadata: { shippingMethodId: methodId },
    }).catch(() => {})
  }

  // ──────────────────────────────────────────────
  // Shared Validation
  // ──────────────────────────────────────────────

  static assertRanges(
    minWeight?: number | null, maxWeight?: number | null,
    minSubtotal?: number | null, maxSubtotal?: number | null,
  ): void {
    if (minWeight != null && maxWeight != null && Number(minWeight) > Number(maxWeight)) {
      throw new AppError(PAYMENT_SHIPPING_MESSAGES.INVALID_WEIGHT_RANGE, 422, ErrorCode.VALIDATION_ERROR)
    }
    if (minSubtotal != null && maxSubtotal != null && Number(minSubtotal) > Number(maxSubtotal)) {
      throw new AppError(PAYMENT_SHIPPING_MESSAGES.INVALID_SUBTOTAL_RANGE, 422, ErrorCode.VALIDATION_ERROR)
    }
  }
}
