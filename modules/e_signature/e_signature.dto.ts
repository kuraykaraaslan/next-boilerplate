import { z } from 'zod';
import { CountryCodeSchema, IdentifierSchema } from './e_signature.types';

export const InitiateLoginDTO = z.object({
  country: CountryCodeSchema,
  identifier: IdentifierSchema,
  providerOverride: z.string().optional(),
});
export type InitiateLoginInput = z.infer<typeof InitiateLoginDTO>;

export const PollStatusDTO = z.object({
  transactionId: z.string().uuid(),
});
export type PollStatusInput = z.infer<typeof PollStatusDTO>;

export const InitiateBindDTO = z.object({
  country: CountryCodeSchema,
  identifier: IdentifierSchema,
  providerOverride: z.string().optional(),
  otpToken: z.string().min(1),
});
export type InitiateBindInput = z.infer<typeof InitiateBindDTO>;

export const CountryHintQueryDTO = z.object({
  locale: z.string().optional(),
});
export type CountryHintQuery = z.infer<typeof CountryHintQueryDTO>;
