# SMS — NetGSM

- **id:** `sms_netgsm`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/sms_netgsm/`
- **tags:** notifications, sms, provider
- **icon:** `fas fa-comment-sms`
- **hasNextLayer:** false

NetGSM SMS backend for the notification_sms module.

## Dependencies

- **requires:** `notification_sms`, `env`, `setting`

## README

# sms_netgsm

NetGSM SMS provider satellite for the [`notification_sms`](../notification_sms) host.
Contributes the `netgsm` backend into the `sms:provider` extension point.
Enable/disable per tenant via `module.sms_netgsm.enabled`.
