import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { Carrier as CarrierEntity } from './entities/carrier.entity'
import { CarrierSchema, type Carrier } from './order_fulfillment.types'
import type { CreateCarrierDTO, UpdateCarrierDTO, GetCarriersQuery } from './order_fulfillment.dto'
import { ORDER_FULFILLMENT_MESSAGES } from './order_fulfillment.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/**
 * Tenant-configurable carrier master-data CRUD (the carrier list surfaced on
 * the Settings page). Distinct from the carrier *adapter* bridge
 * (`order_fulfillment.carrier.service`) which talks to payment_shipping.
 */
export default class OrderFulfillmentCarrierConfigService {
  static async list(tenantId: string, query: GetCarriersQuery): Promise<{ data: Carrier[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [rows, total] = await ds.getRepository(CarrierEntity).findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => CarrierSchema.parse(r)), total }
  }

  static async getById(tenantId: string, carrierId: string): Promise<Carrier> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(CarrierEntity).findOne({ where: { tenantId, carrierId } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.CARRIER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return CarrierSchema.parse(row)
  }

  static async create(tenantId: string, dto: CreateCarrierDTO): Promise<Carrier> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(CarrierEntity)
    const clash = await repo.findOne({ where: { tenantId, code: dto.code.toUpperCase() } })
    if (clash) throw new AppError(ORDER_FULFILLMENT_MESSAGES.CARRIER_CODE_TAKEN, 409, ErrorCode.CONFLICT)
    try {
      const saved = await repo.save(repo.create({ tenantId, ...dto, code: dto.code.toUpperCase() }))
      return CarrierSchema.parse(saved)
    } catch (error) {
      Logger.error(`[OrderFulfillmentCarrierConfigService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(ORDER_FULFILLMENT_MESSAGES.CARRIER_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, carrierId: string, dto: UpdateCarrierDTO): Promise<Carrier> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(CarrierEntity)
    const row = await repo.findOne({ where: { tenantId, carrierId } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.CARRIER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, dto)
    const saved = await repo.save(row)
    return CarrierSchema.parse(saved)
  }

  static async delete(tenantId: string, carrierId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(CarrierEntity)
    const row = await repo.findOne({ where: { tenantId, carrierId } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.CARRIER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
