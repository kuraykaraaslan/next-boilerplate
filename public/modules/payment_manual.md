# Cash / Wire (Manual)

- **id:** `payment_manual`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/payment_manual/`
- **tags:** billing, payment, gateway, offline, manual
- **icon:** `fas fa-money-bill-wave`
- **hasNextLayer:** false

Offline settlement gateway for cash or bank wire. Records the payment as PENDING and shows operator-authored instructions (the manualPaymentNote setting); an operator marks it paid once funds arrive. Contributed into the payment:gateway extension point.

## Dependencies

- **requires:** `payment`, `setting`, `common`
