# Possible Setting Keys

| Key | Source | Notes |
| --- | --- | --- |
| env:METRICS_ENABLED | metrics.ts | toggles metrics endpoint |
| env:SENTRY_DSN | sentry.init.ts | Sentry DSN |
| env:SENTRY_ENVIRONMENT | sentry.init.ts | Sentry environment label |
| env:NODE_ENV | sentry.init.ts | fallback for environment |
| env:APPLICATION_VERSION | sentry.init.ts | release tag |
| env:SENTRY_TRACES_SAMPLE_RATE | sentry.init.ts | traces sample rate |
| env:SENTRY_PROFILES_SAMPLE_RATE | sentry.init.ts | profiles sample rate |
