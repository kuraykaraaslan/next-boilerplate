import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { FormSubmission } from './entities/form_submissions.entity'
import type { CreateFormSubmissionDTO, GetFormSubmissionsQuery } from './form_builder.dto'
import { FORM_BUILDER_MESSAGES } from './form_builder.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped form submission read/delete. */
export default class FormSubmissionService {
  static async list(tenantId: string, query: GetFormSubmissionsQuery): Promise<{ data: FormSubmission[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FormSubmission)
    const where: Record<string, unknown> = { tenantId }
    if (query.formId) where['formId'] = query.formId
    const [data, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, submissionId: string): Promise<FormSubmission> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(FormSubmission).findOne({ where: { tenantId, submissionId } })
    if (!row) throw new AppError(FORM_BUILDER_MESSAGES.SUBMISSION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateFormSubmissionDTO): Promise<FormSubmission> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FormSubmission)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[FormSubmissionService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(FORM_BUILDER_MESSAGES.SUBMISSION_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async delete(tenantId: string, submissionId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FormSubmission)
    const row = await repo.findOne({ where: { tenantId, submissionId } })
    if (!row) throw new AppError(FORM_BUILDER_MESSAGES.SUBMISSION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
  }
}
