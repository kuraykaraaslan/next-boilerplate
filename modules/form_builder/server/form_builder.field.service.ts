import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { Form } from './entities/forms.entity'
import { FormField } from './entities/form_fields.entity'
import type { AddFormFieldDTO, UpdateFormFieldDTO, GetFormFieldsQuery } from './form_builder.dto'
import { FORM_BUILDER_MESSAGES } from './form_builder.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped form field (line item) CRUD under a parent Form. */
export default class FormFieldService {
  static async listByParent(
    tenantId: string,
    formId: string,
    query: GetFormFieldsQuery,
  ): Promise<{ data: FormField[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId, formId }
    if (query.search) where['label'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(FormField).findAndCount({
      where,
      order: { order: 'ASC', createdAt: 'ASC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async addLine(tenantId: string, formId: string, data: AddFormFieldDTO): Promise<FormField> {
    const ds = await tenantDataSourceFor(tenantId)
    const form = await ds.getRepository(Form).findOne({ where: { tenantId, formId } })
    if (!form) throw new AppError(FORM_BUILDER_MESSAGES.FORM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const repo = ds.getRepository(FormField)
    try {
      return await repo.save(repo.create({ tenantId, formId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[FormFieldService.addLine][tenant:${tenantId}] ${error}`)
      throw new AppError(FORM_BUILDER_MESSAGES.FIELD_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async updateLine(
    tenantId: string,
    formId: string,
    fieldId: string,
    data: UpdateFormFieldDTO,
  ): Promise<FormField> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FormField)
    const row = await repo.findOne({ where: { tenantId, formId, fieldId } })
    if (!row) throw new AppError(FORM_BUILDER_MESSAGES.FIELD_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return await repo.save(row)
  }

  static async deleteLine(tenantId: string, formId: string, fieldId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FormField)
    const row = await repo.findOne({ where: { tenantId, formId, fieldId } })
    if (!row) throw new AppError(FORM_BUILDER_MESSAGES.FIELD_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
  }
}
