import { z } from 'zod'
import { FormStatusEnum } from './form_builder.enums'

// ============================================================================
// Form DTOs
// ============================================================================

export const CreateFormDTO = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  status: FormStatusEnum.optional(),
})
export type CreateFormDTO = z.infer<typeof CreateFormDTO>

export const UpdateFormDTO = CreateFormDTO.partial()
export type UpdateFormDTO = z.infer<typeof UpdateFormDTO>

export const GetFormsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetFormsQuery = z.infer<typeof GetFormsQuery>

// ============================================================================
// FormField DTOs
// ============================================================================

export const CreateFormFieldDTO = z.object({
  formId: z.string().uuid(),
  label: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean().optional(),
  order: z.number().int().optional(),
})
export type CreateFormFieldDTO = z.infer<typeof CreateFormFieldDTO>

/** Field payload from the panel (formId comes from the route param). */
export const AddFormFieldDTO = z.object({
  label: z.string().min(1),
  type: z.string().min(1).default('text'),
  required: z.boolean().optional().default(false),
  order: z.coerce.number().int().default(0),
})
export type AddFormFieldDTO = z.infer<typeof AddFormFieldDTO>

export const UpdateFormFieldDTO = AddFormFieldDTO.partial()
export type UpdateFormFieldDTO = z.infer<typeof UpdateFormFieldDTO>

export const GetFormFieldsQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(200).default(100),
  search: z.string().optional(),
})
export type GetFormFieldsQuery = z.infer<typeof GetFormFieldsQuery>

// ============================================================================
// FormSubmission DTOs
// ============================================================================

export const CreateFormSubmissionDTO = z.object({
  formId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
})
export type CreateFormSubmissionDTO = z.infer<typeof CreateFormSubmissionDTO>

export const GetFormSubmissionsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  formId: z.string().uuid().optional(),
})
export type GetFormSubmissionsQuery = z.infer<typeof GetFormSubmissionsQuery>
