# Mail — Amazon SES

- **id:** `mail_ses`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/mail_ses/`
- **tags:** notifications, mail, provider
- **icon:** `fas fa-envelope`
- **hasNextLayer:** false

Amazon SES email backend for the notification_mail module.

## Dependencies

- **requires:** `notification_mail`, `env`, `setting`

## README

# mail_ses

Amazon SES mail provider satellite for the [`notification_mail`](../notification_mail) host.
Contributes the `ses` backend into the `mail:provider` extension point.
Enable/disable per tenant via `module.mail_ses.enabled`.
