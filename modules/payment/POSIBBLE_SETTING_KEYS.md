# Possible Setting Keys

| Key | Source | Notes |
| --- | --- | --- |
| stripeEnabled | payment.setting.keys.ts | system-level |
| stripePublicKey | payment.setting.keys.ts | system-level |
| stripeSecretKey | payment.setting.keys.ts | system-level |
| stripeWebhookSecret | payment.setting.keys.ts | system-level |
| paypalEnabled | payment.setting.keys.ts | system-level |
| paypalClientId | payment.setting.keys.ts | system-level |
| paypalClientSecret | payment.setting.keys.ts | system-level |
| paypalSandboxMode | payment.setting.keys.ts | system-level |
| paypalWebhookId | payment.setting.keys.ts | system-level |
| iyzicoEnabled | payment.setting.keys.ts | system-level |
| iyzicoApiKey | payment.setting.keys.ts | system-level |
| iyzicoSecretKey | payment.setting.keys.ts | system-level |
| iyzicoSandboxMode | payment.setting.keys.ts | system-level |
| alipayEnabled | payment.setting.keys.ts | system-level |
| alipayAppId | payment.setting.keys.ts | system-level |
| alipayPrivateKey | payment.setting.keys.ts | system-level |
| alipayPublicKey | payment.setting.keys.ts | system-level |
| alipaySandboxMode | payment.setting.keys.ts | system-level |
| wechatPayEnabled | payment.setting.keys.ts | system-level |
| wechatPayAppId | payment.setting.keys.ts | system-level |
| wechatPayMchId | payment.setting.keys.ts | system-level |
| wechatPayPrivateKey | payment.setting.keys.ts | system-level |
| wechatPaySerialNo | payment.setting.keys.ts | system-level |
| wechatPayApiV3Key | payment.setting.keys.ts | system-level |
| wechatPayNotifyUrl | payment.setting.keys.ts | system-level |
| yookassaEnabled | payment.setting.keys.ts | system-level |
| yookassaShopId | payment.setting.keys.ts | system-level |
| yookassaSecretKey | payment.setting.keys.ts | system-level |
| cloudpaymentsEnabled | payment.setting.keys.ts | system-level |
| cloudpaymentsPublicId | payment.setting.keys.ts | system-level |
| cloudpaymentsApiSecret | payment.setting.keys.ts | system-level |
| currency | payment.setting.keys.ts | system-level (payment) and tenant billing |
| taxRate | payment.setting.keys.ts | system-level |
| taxEnabled | payment.setting.keys.ts | system-level |
| billingEmail | payment.setting.keys.ts | tenant billing |
| billingName | payment.setting.keys.ts | tenant billing |
| billingAddress | payment.setting.keys.ts | tenant billing |
| taxId | payment.setting.keys.ts | tenant billing |
| vatNumber | payment.setting.keys.ts | tenant billing |
| invoicePrefix | payment.setting.keys.ts | tenant billing |
| invoiceFooter | payment.setting.keys.ts | tenant billing |
| stripeCustomerId | stripe.provider.ts | used via SettingService but not declared in payment.setting.keys.ts |
| invoiceDefaultCurrency | payment.webhook.service.ts | declared in invoice.setting.keys.ts (external) |
