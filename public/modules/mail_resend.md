# Mail — Resend

- **id:** `mail_resend`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/mail_resend/`
- **tags:** notifications, mail, provider
- **icon:** `fas fa-envelope`
- **hasNextLayer:** false

Resend email backend for the notification_mail module.

## Dependencies

- **requires:** `notification_mail`, `env`, `setting`

## README

# mail_resend

Resend mail provider satellite for the [`notification_mail`](../notification_mail) host.
Contributes the `resend` backend into the `mail:provider` extension point.
Enable/disable per tenant via `module.mail_resend.enabled`.
