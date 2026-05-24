# Possible Setting Keys

| Key | Source | Notes |
| --- | --- | --- |
| tenantUsageRedisTtlSeconds | tenant_usage.service.ts | candidate; default 32 days |
| usageFlushRemoveOnComplete | tenant_usage.job.ts | candidate; default 10 |
| usageFlushRemoveOnFail | tenant_usage.job.ts | candidate; default 50 |
| usageFlushCronPattern | tenant_usage.job.ts | candidate; default "0 * * * *" |
