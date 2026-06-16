# Mail — Postmark

- **id:** `mail_postmark`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/mail_postmark/`
- **tags:** notifications, mail, provider
- **icon:** `fas fa-envelope`
- **hasNextLayer:** false

Postmark email backend for the notification_mail module.

## Dependencies

- **requires:** `notification_mail`, `env`, `setting`

## README

# mail_postmark

Postmark mail provider satellite for the [`notification_mail`](../notification_mail) host.
Contributes the `postmark` backend into the `mail:provider` extension point.
Enable/disable per tenant via `module.mail_postmark.enabled`.
