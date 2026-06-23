import { z } from 'zod'

export const FormStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
export type FormStatus = z.infer<typeof FormStatusEnum>
