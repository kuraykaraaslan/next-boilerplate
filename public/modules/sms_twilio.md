# SMS — Twilio

- **id:** `sms_twilio`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/sms_twilio/`
- **tags:** notifications, sms, provider
- **icon:** `fas fa-comment-sms`
- **hasNextLayer:** false

Twilio SMS backend for the notification_sms module.

## Dependencies

- **requires:** `notification_sms`, `env`, `setting`

## README

# sms_twilio

Twilio SMS provider satellite for the [`notification_sms`](../notification_sms) host.
Contributes the `twilio` backend into the `sms:provider` extension point.
Enable/disable per tenant via `module.sms_twilio.enabled`.
