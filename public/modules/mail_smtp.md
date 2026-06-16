# Mail — SMTP

- **id:** `mail_smtp`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/mail_smtp/`
- **tags:** notifications, mail, provider
- **icon:** `fas fa-envelope`
- **hasNextLayer:** false

SMTP email backend for the notification_mail module.

## Dependencies

- **requires:** `notification_mail`, `env`, `setting`

## README

# mail_smtp

SMTP mail provider satellite for the [`notification_mail`](../notification_mail) host.
Contributes the `smtp` backend into the `mail:provider` extension point.
Enable/disable per tenant via `module.mail_smtp.enabled`.
