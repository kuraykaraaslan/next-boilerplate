import { z } from 'zod';

// PaymentMethod DTOs (configurable master-data)
export const CreatePaymentMethodDTO = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  gateway: z.string().optional(),
  isActive: z.boolean().optional().default(false),
});
export type CreatePaymentMethodDTO = z.infer<typeof CreatePaymentMethodDTO>;

export const UpdatePaymentMethodDTO = CreatePaymentMethodDTO.partial();
export type UpdatePaymentMethodDTO = z.infer<typeof UpdatePaymentMethodDTO>;

export const GetPaymentMethodsQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  search: z.string().optional(),
});
export type GetPaymentMethodsQuery = z.infer<typeof GetPaymentMethodsQuery>;
