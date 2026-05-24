# Possible Setting Keys

| Key | Source | Notes |
| --- | --- | --- |
| webhookMaxAttempts | webhook.service.ts | candidate; default 3 |
| webhookRetryDelaysMs | webhook.service.ts | candidate; default [60000, 300000, 900000] |
| webhookWorkerConcurrency | webhook.service.ts | candidate; default 10 |
| webhookRequestTimeoutMs | webhook.service.ts | candidate; default 15000 |
