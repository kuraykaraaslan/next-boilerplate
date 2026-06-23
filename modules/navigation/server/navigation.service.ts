import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { NavigationMenu } from './entities/navigation_menus.entity'
import type { CreateNavigationMenuDTO, UpdateNavigationMenuDTO, GetNavigationMenusQuery } from './navigation.dto'
import { NAVIGATION_MESSAGES } from './navigation.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped navigation menu CRUD. */
export default class NavigationMenuService {
  static async list(tenantId: string, query: GetNavigationMenusQuery): Promise<{ data: NavigationMenu[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(NavigationMenu)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [data, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, menuId: string): Promise<NavigationMenu> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(NavigationMenu)
    const row = await repo.findOne({ where: { tenantId, menuId } })
    if (!row) throw new AppError(NAVIGATION_MESSAGES.MENU_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateNavigationMenuDTO): Promise<NavigationMenu> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(NavigationMenu)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[NavigationMenuService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(NAVIGATION_MESSAGES.MENU_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, menuId: string, data: UpdateNavigationMenuDTO): Promise<NavigationMenu> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(NavigationMenu)
    const row = await repo.findOne({ where: { tenantId, menuId } })
    if (!row) throw new AppError(NAVIGATION_MESSAGES.MENU_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return await repo.save(row)
  }

  static async delete(tenantId: string, menuId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(NavigationMenu)
    const row = await repo.findOne({ where: { tenantId, menuId } })
    if (!row) throw new AppError(NAVIGATION_MESSAGES.MENU_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
