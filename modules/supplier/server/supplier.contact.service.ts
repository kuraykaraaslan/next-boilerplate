import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { Supplier } from './entities/suppliers.entity'
import { SupplierContact } from './entities/supplier_contacts.entity'
import type {
  AddSupplierContactDTO, UpdateSupplierContactDTO, GetSupplierContactsQuery,
} from './supplier.dto'
import { SUPPLIER_MESSAGES } from './supplier.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped supplier contact line items. */
export default class SupplierContactService {
  static async listByParent(
    tenantId: string,
    supplierId: string,
    query: GetSupplierContactsQuery,
  ): Promise<{ data: SupplierContact[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId, supplierId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(SupplierContact).findAndCount({
      where,
      order: { createdAt: 'ASC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async addLine(
    tenantId: string,
    supplierId: string,
    data: AddSupplierContactDTO,
  ): Promise<SupplierContact> {
    const ds = await tenantDataSourceFor(tenantId)
    const supplier = await ds.getRepository(Supplier).findOne({ where: { tenantId, supplierId } })
    if (!supplier) throw new AppError(SUPPLIER_MESSAGES.SUPPLIER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const repo = ds.getRepository(SupplierContact)
    try {
      return await repo.save(repo.create({ tenantId, supplierId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[SupplierContactService.addLine][tenant:${tenantId}] ${error}`)
      throw new AppError(SUPPLIER_MESSAGES.CONTACT_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async updateLine(
    tenantId: string,
    supplierId: string,
    contactId: string,
    data: UpdateSupplierContactDTO,
  ): Promise<SupplierContact> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SupplierContact)
    const row = await repo.findOne({ where: { tenantId, supplierId, contactId } })
    if (!row) throw new AppError(SUPPLIER_MESSAGES.CONTACT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return await repo.save(row)
  }

  static async deleteLine(tenantId: string, supplierId: string, contactId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SupplierContact)
    const row = await repo.findOne({ where: { tenantId, supplierId, contactId } })
    if (!row) throw new AppError(SUPPLIER_MESSAGES.CONTACT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
  }
}
