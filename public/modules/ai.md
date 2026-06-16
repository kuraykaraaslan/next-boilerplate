# AI

- **id:** `ai`
- **tier:** ai
- **version:** 1.0.0
- **dir:** `modules/ai/`
- **tags:** platform, ai
- **icon:** `fas fa-robot`
- **hasNextLayer:** true

Pluggable AI providers (Anthropic, OpenAI, Google). Chat, embeddings, streaming, usage tracking.

## Dependencies

- **requires:** `env`, `setting`

## Services

- `ai.provider.service.ts`
- `ai.service.ts`
- `ai.usage.service.ts`

## Entities

- `ai_usage_log.entity.ts`

## Message keys

- `ai.messages.ts`

## Setting keys

- `ai.setting.keys.ts`

## Owned API routes

- `tenant` POST `/tenant/[tenantId]/api/ai/stream`

## TypeORM entities

- `AiUsageLog` (system) — `modules/ai/server/entities/ai_usage_log.entity.ts`

## Next layer (modules_next/) surface

- `ai/ui/ai-chat-box.component` _(ui, client)_
- `ai/ui/ai.page` _(ui, client)_
- `ai/ui/settings.page` _(ui, client)_
- `ai/ui/usage-chart.component` _(ui, client)_
- `ai/ui/usage-tab.component` _(ui, client)_

## README

# Ai Module

Multi-provider AI service (OpenAI, Anthropic, Google) supporting chat completions, embeddings, and streaming with per-tenant provider selection, API key management, usage tracking, and subscription-based feature gating. Every provider call resolves its config from the tenant's `Setting` rows (with env fallback) and is gated by the tenant's active subscription plan.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `AiUsageLog` | `ai_usage_logs` | Per-call usage audit row (provider, model, kind, token counts, optional `costUsd`) |

`AiUsageLog` lives in the **tenant DB** (written via `tenantDataSourceFor(tenantId)`) and is the source of truth for "which model did what" reports. The monthly aggregate counter is `TenantUsage.aiTokens`, maintained by the `tenant_usage` module.

---

## Services / Responsibilities

`ai.service.ts` (`AIService`, static class) is the only service. Responsibilities:

| Area | Methods | Responsibility |
|---|---|---|
| Provider resolution | `buildTenantBundle`, `getTenantBundle`, `getProvider`, `getDefaultProvider`, `reinitializeProvider`, `invalidateTenant` | Build/cache a per-tenant bundle of OpenAI/Anthropic/Google providers from `Setting` rows + env fallback; bundle cached in `_tenantProviders` `Map` keyed by `tenantId` |
| Provider/model catalog | `listProviders`, `listConfiguredProviders`, `isProviderConfigured`, `listModels`, `listAllModels`, `getProviderForModel` | Enumerate providers, report which are configured for a tenant, and map a model name back to its provider |
| Feature gating | `assertAiFeatureAccess` (private) | Asserts the tenant's plan grants `FEATURE_AI_CHAT` and that `FEATURE_AI_MONTHLY_TOKENS` (vs. `TenantUsage.aiTokens`) is not exhausted; short-circuits for the root tenant |
| Completion | `chat`, `chatStream`, `complete`, `ask` | Resolve provider (explicit, inferred from model, or tenant default), assert configuration, call the provider, then track usage |
| Embeddings | `embed` | Generate embeddings and track usage |
| Usage tracking | `trackUsage`, `recordUsage`, `recordEmbedUsage`, `getUsage`, `getTotalUsage` | Write the Redis daily counter + bridge to `TenantUsage.aiTokens`, persist an `AiUsageLog` row, and read daily/total token usage back |
| Rate limiting | `isRateLimited`, `setRateLimit` | Redis flag helpers under `ai:rate-limit:<key>` |

### Providers (`providers/`)

| File | Provider | Notes |
|---|---|---|
| `base.provider.ts` | — | Abstract `BaseAIProvider` defining `chat`, `chatStream`, `embed`, `listModels`, `isConfigured` |
| `openai.provider.ts` | `openai` | REST against OpenAI (or custom `baseUrl`, e.g. Azure / local proxy) |
| `anthropic.provider.ts` | `anthropic` | REST against Anthropic Messages API |
| `google.provider.ts` | `google` | REST against Google Gemini API |

Model catalogs live in `ai.types.ts` (`OpenAIModels`, `AnthropicModels`, `GoogleModels`). A provider `isConfigured()` only when its API key is present.

---

## API Routes

All routes live under `/tenant/[tenantId]/api/ai/...` and are rate-limited via `Limiter.checkRateLimit`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/ai/chat` | Authenticated user | Chat completion; provider chain resolved from the tenant's settings |
| POST | `/ai/stream` | Authenticated user | Streaming chat completion (`text/event-stream`, SSE `data:` chunks) |
| POST | `/ai/embed` | Authenticated user | Generate embeddings |
| GET | `/ai/models` | Authenticated user | List all known models across providers |
| GET | `/ai/providers` | Tenant ADMIN | List providers and whether each is configured for the tenant |
| GET | `/ai/usage` | Tenant ADMIN | Per-tenant usage by provider over `days` (default 30, max 90) |

A provider that is not configured surfaces as HTTP `503` (`code: NOT_CONFIGURED`).

---

## Settings

Setting keys are defined in `ai.setting.keys.ts` (`AI_KEYS`). Per-call config is read for the tenant in `buildTenantBundle`, with env fallback.

| Key | Used by | Notes |
|---|---|---|
| `aiEnabled` | — | Reserved general toggle |
| `aiDefaultProvider` | `buildTenantBundle` | Tenant default provider (`openai`\|`anthropic`\|`google`) |
| `aiDailyLimit`, `aiMonthlyBudget` | — | Reserved budget settings |
| `openaiApiKey`, `openaiDefaultModel`, `openaiMaxTokens`, `openaiBaseUrl` | OpenAI provider | Falls back to `env.OPENAI_*`; model default `gpt-4o-mini`, max tokens `4096` |
| `anthropicApiKey`, `anthropicDefaultModel`, `anthropicMaxTokens` | Anthropic provider | Falls back to `env.ANTHROPIC_*`; model default `claude-3-5-sonnet-20241022`, max tokens `4096` |
| `googleAiApiKey`, `googleDefaultModel`, `googleMaxTokens` | Google provider | Falls back to `env.GOOGLE_*`; model default `gemini-2.0-flash`, max tokens `4096` |
| `huggingfaceToken`, `tinymceApiKey` | — | Reserved third-party keys |

After changing settings, call `AIService.invalidateTenant(tenantId)` (or `reinitializeProvider`) so the cached bundle rebuilds.

---

## Security

- Every chat/stream/embed call goes through `assertAiFeatureAccess`, which enforces the subscription `FEATURE_AI_CHAT` boolean and the `FEATURE_AI_MONTHLY_TOKENS` limit. The root tenant (`isRootTenant`) bypasses this gate.
- Provider API keys are read from per-tenant `Setting` rows (or env) and are never returned by the API routes.
- Mutating routes (`/ai/usage`, `/ai/providers`) require tenant `ADMIN`; the `/usage` route is documented as root-tenant-admin facing.

---

## Basic Usage

```typescript
import AIService from '@/modules/ai/ai.service';

// Chat completion — tenantId is always the first argument
const response = await AIService.chat(tenantId, {
  messages: [{ role: 'user', content: 'Hello' }],
  provider: 'anthropic', // optional; otherwise tenant default / inferred from model
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 1024,
});

// response.content, response.model, response.provider, response.usage
```

---

## Usage tracking & audit

Every successful `chat`, `chatStream`, and `embed` call writes:

1. A Redis daily counter (`ai:usage:<tenantId>:<provider>:<YYYY-MM-DD>`, 30-day TTL) — backwards-compatible per-day usage.
2. A monthly `TenantUsage.aiTokens` counter via `TenantUsageService.incrementAiTokens(tenantId, totalTokens)`. This is what billing / quota enforcement reads.
3. A per-call `AiUsageLog` row (`entities/ai_usage_log.entity.ts`) with `provider`, `model`, `kind` (`chat`/`stream`/`embed`), `inputTokens`, `outputTokens`, `totalTokens`, optional `costUsd`, `createdAt`.

All audit writes are best-effort — a Redis or DB hiccup never breaks the provider response.

---

## Adding a New Provider

1. Extend `BaseAIProvider` in `providers/`.
2. Add it to `TenantProviderBundle` and the `switch` in `getProvider` / `buildTenantBundle` in `ai.service.ts`.
3. Add the model catalog to `ai.types.ts` and the setting keys to `ai.setting.keys.ts`.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Multi-provider AI service (OpenAI, Anthropic, Google) supporting chat, embeddings, and streaming with per-tenant provider selection, API key management, usage tracking, and subscription-based feature gating.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `aiDefaultProvider` | string | `openai` | tenant | Tenant-wide default AI provider selection (openai\|anthropic\|google); caller may override per-request | `ai.service.ts` |
| `openaiApiKey` | string | — | tenant | OpenAI API key for the tenant; falls back to env.OPENAI_API_KEY if not set | `ai.service.ts` |
| `openaiDefaultModel` | string | `gpt-4o-mini` | tenant | Default OpenAI model for the tenant; falls back to env.OPENAI_DEFAULT_MODEL | `ai.service.ts` |
| `openaiMaxTokens` | number | `4096` | tenant | Maximum tokens per OpenAI request for the tenant; falls back to env.OPENAI_MAX_TOKENS | `ai.service.ts` |
| `openaiBaseUrl` | string | — | tenant | Optional custom OpenAI base URL (e.g., for Azure OpenAI or local proxy) | `ai.service.ts` |
| `anthropicApiKey` | string | — | tenant | Anthropic API key for the tenant; falls back to env.ANTHROPIC_API_KEY if not set | `ai.service.ts` |
| `anthropicDefaultModel` | string | `claude-3-5-sonnet-20241022` | tenant | Default Anthropic model for the tenant; falls back to env.ANTHROPIC_DEFAULT_MODEL | `ai.service.ts` |
| `anthropicMaxTokens` | number | `4096` | tenant | Maximum tokens per Anthropic request for the tenant; falls back to env.ANTHROPIC_MAX_TOKENS | `ai.service.ts` |
| `googleAiApiKey` | string | — | tenant | Google AI (Gemini) API key for the tenant; falls back to env.GOOGLE_AI_API_KEY if not set | `ai.service.ts` |
| `googleDefaultModel` | string | `gemini-2.0-flash` | tenant | Default Google Gemini model for the tenant; falls back to env.GOOGLE_DEFAULT_MODEL | `ai.service.ts` |
| `googleMaxTokens` | number | `4096` | tenant | Maximum tokens per Google request for the tenant; falls back to env.GOOGLE_MAX_TOKENS | `ai.service.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `AiUsageLog` | `ai_usage_logs` | provider, model, kind, inputTokens, outputTokens, totalTokens, costUsd |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `ai.service.ts:buildTenantBundle` — Each tenant builds its own provider bundle (OpenAI, Anthropic, Google) from per-tenant Setting rows + env fallback, enabling provider/model/maxTokens to differ per tenant
- `ai.service.ts:getTenantBundle` — Lazy-builds and caches per-tenant provider bundle in _tenantProviders Map; miss triggers buildTenantBundle
- `ai.service.ts:getProvider` — Returns a provider instance for the tenant, from the per-tenant bundle; defaults to aiDefaultProvider Setting for that tenant
- `ai.service.ts:assertAiFeatureAccess` — Gates AI access via TenantSubscriptionService.assertFeatureAccess for FEATURE_AI_CHAT (boolean) and FEATURE_AI_MONTHLY_TOKENS (limit vs. TenantUsage.aiTokens); bypasses check for ROOT_TENANT_ID
- `ai.service.ts:chat, chatStream, embed` — Track usage into per-tenant Redis counter (ai:usage:<tenantId>:<provider>:<date>) and per-tenant DB (AiUsageLog) row; increment per-tenant TenantUsage.aiTokens for billing quota
- `ai.service.ts:getUsage, getTotalUsage` — Retrieve per-tenant daily/total AI token usage from Redis (ai:usage:<tenantId>:<provider>:<date>)
- `app/tenant/[tenantId]/api/ai/usage/route.ts` — Admin-only endpoint returns per-tenant usage breakdown by provider and date range (query param: days, default 30)

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Default temperature (0.7) and topP (1) for all providers | `providers/openai.provider.ts, providers/anthropic.provider.ts, providers/google.provider.ts` | Hardcoded fallback values when caller does not specify; tenants with strict compliance or cost-optimization requirements may want to enforce different defaults (e.g., temperature=0 for deterministic behavior) | `openaiDefaultTemperature, openaiDefaultTopP (and similarly for anthropic/google)` |

### Platform/root-only settings (not per-tenant)

Configured once at the root tenant; identical for all tenants:

- `AI_DEFAULT_PROVIDER` — Platform-wide fallback provider when neither tenant settings nor env.AI_DEFAULT_PROVIDER overrides (hardcoded fallback: 'openai')
- `OPENAI_API_KEY` — Platform-wide OpenAI key; per-tenant Setting overrides it
- `OPENAI_DEFAULT_MODEL` — Platform-wide OpenAI default model; per-tenant Setting overrides it
- `OPENAI_MAX_TOKENS` — Platform-wide OpenAI max tokens; per-tenant Setting overrides it
- `ANTHROPIC_API_KEY` — Platform-wide Anthropic key; per-tenant Setting overrides it
- `ANTHROPIC_DEFAULT_MODEL` — Platform-wide Anthropic default model; per-tenant Setting overrides it
- `ANTHROPIC_MAX_TOKENS` — Platform-wide Anthropic max tokens; per-tenant Setting overrides it
- `GOOGLE_AI_API_KEY` — Platform-wide Google API key; per-tenant Setting overrides it
- `GOOGLE_DEFAULT_MODEL` — Platform-wide Google default model; per-tenant Setting overrides it
- `GOOGLE_MAX_TOKENS` — Platform-wide Google max tokens; per-tenant Setting overrides it

---

## Dependencies

Requires `env` and `setting` (per `module.json`). Also integrates with `redis` (usage/rate-limit counters), `db` (`tenantDataSourceFor` for `AiUsageLog`), `tenant_usage` (`TenantUsageService`), and `tenant_subscription` (`TenantSubscriptionService` feature gating).
