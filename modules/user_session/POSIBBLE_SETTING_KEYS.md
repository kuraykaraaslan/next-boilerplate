# Possible Setting Keys

| Key | Source | Notes |
| --- | --- | --- |
| env:APPLICATION_DOMAIN | user_session.token.service.ts | cookie domain |
| env:ACCESS_TOKEN_SECRET | user_session.token.service.ts | access token secret |
| env:ACCESS_TOKEN_EXPIRES_IN | user_session.token.service.ts | access token TTL |
| env:REFRESH_TOKEN_SECRET | user_session.token.service.ts | refresh token secret |
| env:REFRESH_TOKEN_EXPIRES_IN | user_session.token.service.ts | refresh token TTL |
| env:SESSION_EXPIRY_MS | user_session.crud.service.ts | session expiry |
| env:SESSION_CACHE_TTL | user_session.crud.service.ts | session cache TTL |
| impersonationSessionTtlMs | user_session.crud.service.ts | candidate; default 1h |
| sessionIdleMinTtlSeconds | user_session.crud.service.ts | candidate; min 60s |
