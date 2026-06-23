import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { Form } from './entities/forms.entity'
import type { CreateFormDTO, UpdateFormDTO, GetFormsQuery } from './form_builder.dto'
import type { FormStatus } from './form_builder.enums'
import { FORM_BUILDER_MESSAGES } from './form_builder.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

type TransitionDef = { from: FormStatus[]; to: FormStatus }
const TRANSITIONS: Record<string, TransitionDef> = {
  publish: { from: ['DRAFT', 'ARCHIVED'], to: 'PUBLISHED' },
  archive: { from: ['PUBLISHED', 'DRAFT'], to: 'ARCHIVED' },
}

/** Tenant-scoped form CRUD. */
export default class FormService {
  static async list(tenantId: string, query: GetFormsQuery): Promise<{ data: Form[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Form)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['title'] = ILike(`%${query.search}%`)
    const [data, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, formId: string): Promise<Form> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(Form).findOne({ where: { tenantId, formId } })
    if (!row) throw new AppError(FORM_BUILDER_MESSAGES.FORM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateFormDTO): Promise<Form> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Form)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[FormService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(FORM_BUILDER_MESSAGES.FORM_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, formId: string, data: UpdateFormDTO): Promise<Form> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Form)
    const row = await repo.findOne({ where: { tenantId, formId } })
    if (!row) throw new AppError(FORM_BUILDER_MESSAGES.FORM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return await repo.save(row)
  }

  static async delete(tenantId: string, formId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Form)
    const row = await repo.findOne({ where: { tenantId, formId } })
    if (!row) throw new AppError(FORM_BUILDER_MESSAGES.FORM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }

  /**
   * Apply a status-workflow transition: assert the current status is allowed
   * for the requested action, then set the new status.
   */
  static async transition(tenantId: string, formId: string, action: string): Promise<Form> {
    const def = TRANSITIONS[action]
    if (!def) throw new AppError(FORM_BUILDER_MESSAGES.FORM_TRANSITION_INVALID, 400, ErrorCode.VALIDATION_ERROR)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Form)
    const row = await repo.findOne({ where: { tenantId, formId } })
    if (!row) throw new AppError(FORM_BUILDER_MESSAGES.FORM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (!def.from.includes(row.status as FormStatus)) {
      throw new AppError(FORM_BUILDER_MESSAGES.FORM_TRANSITION_INVALID, 409, ErrorCode.CONFLICT)
    }
    row.status = def.to
    return await repo.save(row)
  }

  static publish(tenantId: string, formId: string) { return this.transition(tenantId, formId, 'publish') }
  static archive(tenantId: string, formId: string) { return this.transition(tenantId, formId, 'archive') }
}
