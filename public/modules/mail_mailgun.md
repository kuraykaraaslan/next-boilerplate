# Mail — Mailgun

- **id:** `mail_mailgun`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/mail_mailgun/`
- **tags:** notifications, mail, provider
- **icon:** `fas fa-envelope`
- **hasNextLayer:** false

Mailgun email backend for the notification_mail module.

## Dependencies

- **requires:** `notification_mail`, `env`, `setting`

## README

# mail_mailgun

Mailgun mail provider satellite for the [`notification_mail`](../notification_mail) host.
Contributes the `mailgun` backend into the `mail:provider` extension point.
Enable/disable per tenant via `module.mail_mailgun.enabled`.
