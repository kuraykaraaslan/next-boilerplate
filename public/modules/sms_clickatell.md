# SMS — Clickatell

- **id:** `sms_clickatell`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/sms_clickatell/`
- **tags:** notifications, sms, provider
- **icon:** `fas fa-comment-sms`
- **hasNextLayer:** false

Clickatell SMS backend for the notification_sms module.

## Dependencies

- **requires:** `notification_sms`, `env`, `setting`

## README

# sms_clickatell

Clickatell SMS provider satellite for the [`notification_sms`](../notification_sms) host.
Contributes the `clickatell` backend into the `sms:provider` extension point.
Enable/disable per tenant via `module.sms_clickatell.enabled`.
