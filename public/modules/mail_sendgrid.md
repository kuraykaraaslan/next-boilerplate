# Mail — SendGrid

- **id:** `mail_sendgrid`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/mail_sendgrid/`
- **tags:** notifications, mail, provider
- **icon:** `fas fa-envelope`
- **hasNextLayer:** false

SendGrid email backend for the notification_mail module.

## Dependencies

- **requires:** `notification_mail`, `env`, `setting`

## README

# mail_sendgrid

SendGrid mail provider satellite for the [`notification_mail`](../notification_mail) host.
Contributes the `sendgrid` backend into the `mail:provider` extension point.
Enable/disable per tenant via `module.mail_sendgrid.enabled`.
