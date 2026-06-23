import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { RedirectRule } from './entities/redirect_rules.entity'
import type { CreateRedirectRuleDTO, UpdateRedirectRuleDTO, GetRedirectRulesQuery } from './redirect.dto'
import { REDIRECT_MESSAGES } from './redirect.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped redirect rule CRUD. */
export default class RedirectService {
  static async list(tenantId: string, query: GetRedirectRulesQuery): Promise<{ data: RedirectRule[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(RedirectRule)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['fromPath'] = ILike(`%${query.search}%`)
    const [data, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, redirectId: string): Promise<RedirectRule> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(RedirectRule).findOne({ where: { tenantId, redirectId } })
    if (!row) throw new AppError(REDIRECT_MESSAGES.REDIRECT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateRedirectRuleDTO): Promise<RedirectRule> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(RedirectRule)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[RedirectService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(REDIRECT_MESSAGES.REDIRECT_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, redirectId: string, data: UpdateRedirectRuleDTO): Promise<RedirectRule> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(RedirectRule)
    const row = await repo.findOne({ where: { tenantId, redirectId } })
    if (!row) throw new AppError(REDIRECT_MESSAGES.REDIRECT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return await repo.save(row)
  }

  static async delete(tenantId: string, redirectId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(RedirectRule)
    const row = await repo.findOne({ where: { tenantId, redirectId } })
    if (!row) throw new AppError(REDIRECT_MESSAGES.REDIRECT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
