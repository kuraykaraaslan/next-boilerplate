# Possible Setting Keys

| Key | Source | Notes |
| --- | --- | --- |
| env:INVITATION_TTL_SECONDS | tenant_invitation.service.ts | invitation TTL default 7 days |
| env:TENANT_CACHE_TTL | tenant_invitation.service.ts | cache TTL |
| invitationNegativeCacheTtlSeconds | tenant_invitation.service.ts | candidate; min 60s |
