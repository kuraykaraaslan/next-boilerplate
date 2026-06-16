# SMS — Vonage (Nexmo)

- **id:** `sms_nexmo`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/sms_nexmo/`
- **tags:** notifications, sms, provider
- **icon:** `fas fa-comment-sms`
- **hasNextLayer:** false

Vonage (Nexmo) SMS backend for the notification_sms module.

## Dependencies

- **requires:** `notification_sms`, `env`, `setting`

## README

# sms_nexmo

Vonage (Nexmo) SMS provider satellite for the [`notification_sms`](../notification_sms) host.
Contributes the `nexmo` backend into the `sms:provider` extension point.
Enable/disable per tenant via `module.sms_nexmo.enabled`.
