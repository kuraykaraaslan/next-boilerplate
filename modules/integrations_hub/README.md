# integrations_hub

A Zapier-like hub for connecting third-party apps. It deliberately does **not**
re-implement delivery, retries, signing, or key verification — outbound triggers
bridge onto the `webhook` module and inbound actions authenticate via the
`api_key` module. This module owns the **connector catalog**, **connection
state**, and **encrypted OAuth tokens**.

## What it does

- **Connector catalog** — per-tenant definitions of available integrations
  (`OAUTH2 | API_KEY | WEBHOOK_ONLY`), including the trigger/action catalog and
  OAuth endpoints. Client secrets are never stored here; only the **setting key**
  that holds them (resolved at runtime via `SettingService`).
- **Connect** — API-key connectors mint a scoped `ApiKey` (returned once); OAuth2
  connectors run a real authorization-code exchange and store **AES-256-GCM
  encrypted** tokens (`@/modules/common/field-encryption`).
- **Outbound triggers** — `fireTrigger(...)` dispatches an
  `integration.trigger_fired` webhook event carrying the connector + event key, so
  the connector's endpoint receives it with the webhook module's signing/retry
  guarantees.
- **Inbound actions** — `handleInboundAction(...)` verifies the inbound API key
  (`write` scope), resolves the connected app, validates the action against the
  catalog, and records it.
- **Event audit** — every outbound/inbound call is logged to `integration_events`.

Connecting is gated behind `FEATURE_KEYS.FEATURE_INTEGRATIONS`
(`assertFeatureAccess`); the root tenant bypasses.

## Public API — `IntegrationsHubService`

| Method | Description |
|---|---|
| `listConnectors(tenantId)` / `getConnector(tenantId, key)` | Read the catalog. |
| `upsertConnector(tenantId, dto)` / `deleteConnector(tenantId, key)` | Manage catalog entries. |
| `connectApiKey(tenantId, userId, dto)` | Connect an API-key connector; returns `{ connectedApp, rawKey }` (key shown once). |
| `beginOAuthConnect(tenantId, userId, dto)` | Returns `{ authorizeUrl, state }` to start an OAuth connect. |
| `completeOAuthConnect(tenantId, { code, state })` | Exchange the code, store encrypted tokens, create the connection. |
| `getAccessToken(tenantId, connectedAppId)` | Valid access token, auto-refreshing near expiry. |
| `refreshTokenIfNeeded(tenantId, connectedAppId)` | Force a refresh-token exchange. |
| `listConnectedApps(tenantId, query)` / `getConnectedApp` / `disconnect` | Manage live connections. |
| `fireTrigger(tenantId, dto)` | Bridge an outbound trigger onto the webhook system. |
| `handleInboundAction(tenantId, rawKey, actionKey, payload, ctx?)` | Authenticate + dispatch an inbound action. |
| `listEvents(tenantId, connectedAppId)` | Read the integration event log. |

## Entities

- `Connector` → `connectors` — catalog (`key` unique per tenant), auth type,
  trigger/action catalog, OAuth endpoints, client-secret **setting key** refs.
- `ConnectedApp` → `connected_apps` — a tenant's live connection; links a
  `webhookId` (outbound) and/or `apiKeyId` (inbound).
- `OAuthToken` → `integration_oauth_tokens` — AES-256-GCM encrypted access/refresh
  tokens, one row per connected app.
- `IntegrationEvent` → `integration_events` — append-only outbound/inbound audit.

## Webhook events

`integration.connected`, `integration.disconnected`, `integration.trigger_fired`,
`integration.error` (group **Integrations**, tenant scope).

## Routes

- `GET/POST /api/integrations/connectors`, `GET/PUT/DELETE /api/integrations/connectors/[key]`
- `POST /api/integrations/connect/api-key`
- `POST /api/integrations/oauth/start`, `GET /api/integrations/oauth/callback` (public, state-validated)
- `GET /api/integrations/connected`, `GET/DELETE /api/integrations/connected/[connectedAppId]`
- `POST /api/integrations/triggers` (fire), `POST /api/integrations/actions/[actionKey]` (inbound, API-key auth)
