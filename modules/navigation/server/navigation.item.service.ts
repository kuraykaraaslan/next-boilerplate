import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { NavigationItem } from './entities/navigation_items.entity'
import { NavigationMenu } from './entities/navigation_menus.entity'
import type { CreateNavigationItemDTO, UpdateNavigationItemDTO } from './navigation.dto'
import { NAVIGATION_MESSAGES } from './navigation.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped navigation menu line-item (NavigationItem) CRUD. */
export default class NavigationItemService {
  private static async assertMenu(tenantId: string, menuId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const menu = await ds.getRepository(NavigationMenu).findOne({ where: { tenantId, menuId } })
    if (!menu) throw new AppError(NAVIGATION_MESSAGES.MENU_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
  }

  static async listByParent(tenantId: string, menuId: string): Promise<{ data: NavigationItem[]; total: number }> {
    await this.assertMenu(tenantId, menuId)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(NavigationItem)
    const [data, total] = await repo.findAndCount({
      where: { tenantId, menuId },
      order: { order: 'ASC', createdAt: 'ASC' },
    })
    return { data, total }
  }

  static async addLine(tenantId: string, menuId: string, data: CreateNavigationItemDTO): Promise<NavigationItem> {
    await this.assertMenu(tenantId, menuId)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(NavigationItem)
    try {
      return await repo.save(repo.create({
        tenantId,
        menuId,
        label: data.label,
        url: data.url,
        order: data.order ?? 0,
        parentId: data.parentId ?? undefined,
      }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[NavigationItemService.addLine][tenant:${tenantId}] ${error}`)
      throw new AppError(NAVIGATION_MESSAGES.ITEM_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async updateLine(
    tenantId: string, menuId: string, itemId: string, data: UpdateNavigationItemDTO,
  ): Promise<NavigationItem> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(NavigationItem)
    const row = await repo.findOne({ where: { tenantId, menuId, itemId } })
    if (!row) throw new AppError(NAVIGATION_MESSAGES.ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (data.label !== undefined) row.label = data.label
    if (data.url !== undefined) row.url = data.url
    if (data.order !== undefined) row.order = data.order
    if (data.parentId !== undefined) row.parentId = data.parentId ?? undefined
    return await repo.save(row)
  }

  static async deleteLine(tenantId: string, menuId: string, itemId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(NavigationItem)
    const row = await repo.findOne({ where: { tenantId, menuId, itemId } })
    if (!row) throw new AppError(NAVIGATION_MESSAGES.ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
