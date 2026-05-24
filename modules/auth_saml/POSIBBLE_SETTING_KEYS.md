# Possible Setting Keys

| Key | Source | Notes |
| --- | --- | --- |
| env:APPLICATION_HOST | auth_saml.service.ts | base app host for callbacks |
| env:TENANT_CACHE_TTL | auth_saml.service.ts | cache TTL |
| samlAppHost | auth_saml.service.ts | candidate; derived from env:APPLICATION_HOST |
| samlCacheTtlSeconds | auth_saml.service.ts | candidate; derived from env:TENANT_CACHE_TTL |
