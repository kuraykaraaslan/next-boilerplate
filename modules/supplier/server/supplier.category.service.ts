import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { SupplierCategory } from './entities/supplier_categories.entity'
import type {
  CreateSupplierCategoryDTO, UpdateSupplierCategoryDTO, GetSupplierCategoriesQuery,
} from './supplier.dto'
import { SUPPLIER_MESSAGES } from './supplier.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped configurable supplier category master-data CRUD. */
export default class SupplierCategoryService {
  static async list(
    tenantId: string,
    query: GetSupplierCategoriesQuery,
  ): Promise<{ data: SupplierCategory[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(SupplierCategory).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, categoryId: string): Promise<SupplierCategory> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(SupplierCategory).findOne({ where: { tenantId, categoryId } })
    if (!row) throw new AppError(SUPPLIER_MESSAGES.CATEGORY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateSupplierCategoryDTO): Promise<SupplierCategory> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SupplierCategory)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[SupplierCategoryService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(SUPPLIER_MESSAGES.CATEGORY_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(
    tenantId: string,
    categoryId: string,
    data: UpdateSupplierCategoryDTO,
  ): Promise<SupplierCategory> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SupplierCategory)
    const row = await repo.findOne({ where: { tenantId, categoryId } })
    if (!row) throw new AppError(SUPPLIER_MESSAGES.CATEGORY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return await repo.save(row)
  }

  static async delete(tenantId: string, categoryId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SupplierCategory)
    const row = await repo.findOne({ where: { tenantId, categoryId } })
    if (!row) throw new AppError(SUPPLIER_MESSAGES.CATEGORY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
