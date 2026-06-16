import { z } from 'zod';

export const OTPMethodEnum = z.enum(['EMAIL', 'SMS', 'TOTP_APP']);
export const OTPActionEnum = z.enum(['enable', 'disable', 'authenticate']);

export type OTPMethod = z.infer<typeof OTPMethodEnum>;
export type OTPAction = z.infer<typeof OTPActionEnum>;
