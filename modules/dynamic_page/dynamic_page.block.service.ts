import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight, jitter } from '@/modules/redis'
import Logger from '@/modules/logger'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { DynamicPageBlock as DynamicPageBlockEntity } from './entities/dynamic_page_block.entity'
import {
  DynamicPageBlockRecordSchema,
  type DynamicPageBlockRecord,
} from './dynamic_page.types'
import type { CreateBlockDTO, UpdateBlockDTO } from './dynamic_page.dto'
import DynamicPageMessages from './dynamic_page.messages'

const BLOCKS_TTL = 300

export const blocksKey = (tenantId: string) => `dp:blocks:${tenantId}`

export default class DynamicPageBlockService {

  static async listBlocks(tenantId: string): Promise<DynamicPageBlockRecord[]> {
    const key = blocksKey(tenantId)
    return singleFlight(key, async () => {
      const cached = await redis.get(key).catch(() => null)
      if (cached) {
        try { return JSON.parse(cached) as DynamicPageBlockRecord[] } catch { await redis.del(key).catch(() => {}) }
      }

      const ds = await tenantDataSourceFor(tenantId)
      const rows = await ds.getRepository(DynamicPageBlockEntity).find({
        where: { tenantId },
        order: { category: 'ASC', label: 'ASC' },
      })
      const parsed = rows.map((r) => DynamicPageBlockRecordSchema.parse(r))
      await redis.setex(key, jitter(BLOCKS_TTL), JSON.stringify(parsed)).catch(() => {})
      return parsed
    })
  }

  static async getBlock(tenantId: string, blockId: string): Promise<DynamicPageBlockRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(DynamicPageBlockEntity).findOne({ where: { tenantId, blockId } })
    if (!row) throw new AppError(DynamicPageMessages.BLOCK_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return DynamicPageBlockRecordSchema.parse(row)
  }

  static async createBlock(tenantId: string, dto: CreateBlockDTO): Promise<DynamicPageBlockRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageBlockEntity)

    const existing = await repo.findOne({ where: { tenantId, type: dto.type } })
    if (existing) throw new AppError(DynamicPageMessages.BLOCK_TYPE_TAKEN, 409, ErrorCode.CONFLICT)

    try {
      const block = repo.create({ tenantId, ...dto })
      const saved = await repo.save(block)
      await redis.del(blocksKey(tenantId)).catch(() => {})
      return DynamicPageBlockRecordSchema.parse(saved)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${DynamicPageMessages.BLOCK_CREATE_FAILED}: ${error}`)
      throw new AppError(DynamicPageMessages.BLOCK_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async updateBlock(tenantId: string, blockId: string, dto: UpdateBlockDTO): Promise<DynamicPageBlockRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageBlockEntity)

    const row = await repo.findOne({ where: { tenantId, blockId } })
    if (!row) throw new AppError(DynamicPageMessages.BLOCK_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    if (dto.type && dto.type !== row.type) {
      const conflict = await repo.findOne({ where: { tenantId, type: dto.type } })
      if (conflict) throw new AppError(DynamicPageMessages.BLOCK_TYPE_TAKEN, 409, ErrorCode.CONFLICT)
    }

    if (dto.type !== undefined) row.type = dto.type
    if (dto.label !== undefined) row.label = dto.label
    if (dto.category !== undefined) row.category = dto.category
    if (dto.description !== undefined) row.description = dto.description
    if (dto.schema !== undefined) row.schema = dto.schema
    if (dto.defaultProps !== undefined) row.defaultProps = dto.defaultProps
    if (dto.template !== undefined) row.template = dto.template
    if (dto.script !== undefined) row.script = dto.script
    if (dto.serverHandler !== undefined) row.serverHandler = dto.serverHandler
    if (dto.allowedCollections !== undefined) row.allowedCollections = dto.allowedCollections
    if (dto.isSystem !== undefined) row.isSystem = dto.isSystem

    try {
      const saved = await repo.save(row)
      await redis.del(blocksKey(tenantId)).catch(() => {})
      return DynamicPageBlockRecordSchema.parse(saved)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${DynamicPageMessages.BLOCK_UPDATE_FAILED}: ${error}`)
      throw new AppError(DynamicPageMessages.BLOCK_UPDATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async deleteBlock(tenantId: string, blockId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageBlockEntity)
    const row = await repo.findOne({ where: { tenantId, blockId } })
    if (!row) throw new AppError(DynamicPageMessages.BLOCK_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (row.isSystem) throw new AppError(DynamicPageMessages.SYSTEM_BLOCK_PROTECTED, 403, ErrorCode.FORBIDDEN)
    await repo.remove(row)
    await redis.del(blocksKey(tenantId)).catch(() => {})
  }
}
