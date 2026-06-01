# Possible Setting Keys

| Key | Source | Notes |
| --- | --- | --- |
| subscriptionEnabled | tenant_subscription.setting.keys.ts | system-level |
| defaultPlanId | tenant_subscription.setting.keys.ts | system-level; free ROOT plan auto-assigned to new tenants. Read/write via get/setDefaultPlanId + `PUT /api/plans/default` |
| trialEnabled | tenant_subscription.setting.keys.ts | system-level |
| defaultTrialDays | tenant_subscription.setting.keys.ts | system-level |
| subscriptionGracePeriodDays | tenant_subscription.setting.keys.ts | system-level |
