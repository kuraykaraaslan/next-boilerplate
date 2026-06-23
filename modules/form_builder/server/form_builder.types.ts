import { z } from 'zod'
import { FormStatusEnum } from './form_builder.enums'

// ============================================================================
// Form
// ============================================================================

export const FormSchema = z.object({
  formId: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  status: FormStatusEnum,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type Form = z.infer<typeof FormSchema>

export const SafeFormSchema = FormSchema.omit({ deletedAt: true })
export type SafeForm = z.infer<typeof SafeFormSchema>

// ============================================================================
// FormField
// ============================================================================

export const FormFieldSchema = z.object({
  fieldId: z.string().uuid(),
  tenantId: z.string().uuid(),
  formId: z.string().uuid(),
  label: z.string(),
  type: z.string(),
  required: z.boolean(),
  order: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type FormField = z.infer<typeof FormFieldSchema>

// ============================================================================
// FormSubmission
// ============================================================================

export const FormSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  formId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type FormSubmission = z.infer<typeof FormSubmissionSchema>
