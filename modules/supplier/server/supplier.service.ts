import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { Supplier } from './entities/suppliers.entity'
import type { CreateSupplierDTO, UpdateSupplierDTO, GetSuppliersQuery } from './supplier.dto'
import { SUPPLIER_MESSAGES } from './supplier.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped supplier/vendor master record CRUD. */
export default class SupplierService {
  static async list(tenantId: string, query: GetSuppliersQuery): Promise<{ data: Supplier[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(Supplier).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, supplierId: string): Promise<Supplier> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(Supplier).findOne({ where: { tenantId, supplierId } })
    if (!row) throw new AppError(SUPPLIER_MESSAGES.SUPPLIER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateSupplierDTO): Promise<Supplier> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Supplier)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[SupplierService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(SUPPLIER_MESSAGES.SUPPLIER_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, supplierId: string, data: UpdateSupplierDTO): Promise<Supplier> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Supplier)
    const row = await repo.findOne({ where: { tenantId, supplierId } })
    if (!row) throw new AppError(SUPPLIER_MESSAGES.SUPPLIER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return await repo.save(row)
  }

  static async delete(tenantId: string, supplierId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Supplier)
    const row = await repo.findOne({ where: { tenantId, supplierId } })
    if (!row) throw new AppError(SUPPLIER_MESSAGES.SUPPLIER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
