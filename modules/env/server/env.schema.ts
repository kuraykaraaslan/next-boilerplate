import { z } from 'zod';
import { coreFields } from './env.schema.core';
import { providerFields } from './env.schema.providers';
import { platformFields } from './env.schema.platform';

export const EnvSchema = z.object({
  ...coreFields,
  ...providerFields,
  ...platformFields,
}).superRefine((data, ctx) => {
  // Conditional required vars per mail provider
  if (data.MAIL_PROVIDER === 'smtp' && !data.SMTP_HOST) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SMTP_HOST'], message: 'SMTP_HOST is required when MAIL_PROVIDER=smtp' });
  }
  if (data.MAIL_PROVIDER === 'mailgun' && !data.MAILGUN_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['MAILGUN_API_KEY'], message: 'MAILGUN_API_KEY is required when MAIL_PROVIDER=mailgun' });
  }
  if (data.MAIL_PROVIDER === 'postmark' && !data.POSTMARK_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['POSTMARK_API_KEY'], message: 'POSTMARK_API_KEY is required when MAIL_PROVIDER=postmark' });
  }
  if (data.MAIL_PROVIDER === 'sendgrid' && !data.SENDGRID_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SENDGRID_API_KEY'], message: 'SENDGRID_API_KEY is required when MAIL_PROVIDER=sendgrid' });
  }
  if (data.MAIL_PROVIDER === 'resend' && !data.RESEND_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['RESEND_API_KEY'], message: 'RESEND_API_KEY is required when MAIL_PROVIDER=resend' });
  }
  if (data.SECRETS_MANAGER_PROVIDER === 'vault' && !data.VAULT_ADDR) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['VAULT_ADDR'], message: 'VAULT_ADDR is required when SECRETS_MANAGER_PROVIDER=vault' });
  }
});

export type Env = z.infer<typeof EnvSchema>;
