# notification_mail module

Multi-provider email service with BullMQ queue and 15+ pre-built EJS templates. Supports direct and queued sending.

---

## Files

| File | Purpose |
|---|---|
| `notification_mail.service.ts` | Core: send, queue, template rendering, provider selection |
| `notification_mail.setting.keys.ts` | Setting key constants for provider config |
| `providers/base.provider.ts` | Abstract base class |
| `providers/smtp.provider.ts` | SMTP (Nodemailer) |
| `providers/sendgrid.provider.ts` | SendGrid |
| `providers/mailgun.provider.ts` | Mailgun |
| `providers/ses.provider.ts` | AWS SES |
| `providers/postmark.provider.ts` | Postmark |
| `providers/resend.provider.ts` | Resend |
| `templates/welcome.ejs` | Welcome email |
| `templates/new_login.ejs` | New login alert |
| `templates/forgot_password.ejs` | Password reset request |
| `templates/password_reset.ejs` | Password reset confirmation |
| `templates/password_changed.ejs` | Password changed alert |
| `templates/verify_email.ejs` | Email verification |
| `templates/otp.ejs` | OTP code |
| `templates/otp_enabled.ejs` | OTP enabled confirmation |
| `templates/otp_disabled.ejs` | OTP disabled confirmation |
| `templates/email_change.ejs` | Email change verification |
| `templates/new_device_alert.ejs` | New device login alert |
| `templates/suspicious_activity.ejs` | Suspicious activity alert |
| `templates/tenant_invitation.ejs` | Tenant member invitation |

---

## Sending an Email

```typescript
import MailService from '@/modules/notification_mail/notification_mail.service';

// Send immediately
await MailService.send({
  to: 'user@example.com',
  subject: 'Welcome!',
  template: 'welcome',
  data: { name: 'Alice' },
});

// Queue for async sending
await MailService.queue({
  to: 'user@example.com',
  template: 'tenant_invitation',
  data: { inviterName: 'Bob', tenantName: 'Acme', token: inviteToken },
});
```

---

## Providers

Active provider is selected from settings key `MAIL_PROVIDER`. Supported values: `smtp`, `sendgrid`, `mailgun`, `ses`, `postmark`, `resend`.

---

## Adding a New Template

1. Create `templates/<name>.ejs`
2. Add the template name to the service's template map
3. Call `MailService.send({ template: '<name>', data: {...} })`
