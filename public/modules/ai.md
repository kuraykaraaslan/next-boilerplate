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

- `ai.service.ts`

## Entities

- `ai_usage_log.entity.ts`

## Setting keys

- `ai.setting.keys.ts`

## Owned API routes

- `tenant` POST `/tenant/[tenantId]/api/ai/chat`
- `tenant` POST `/tenant/[tenantId]/api/ai/embed`
- `tenant` GET `/tenant/[tenantId]/api/ai/models`
- `tenant` GET `/tenant/[tenantId]/api/ai/providers`
- `tenant` POST `/tenant/[tenantId]/api/ai/stream`
- `tenant` GET `/tenant/[tenantId]/api/ai/usage`

## TypeORM entities

- `AiUsageLog` (system) — `modules/ai/entities/ai_usage_log.entity.ts`

## Next layer (modules_next/) surface

- `ai/ui/AIChatBox` _(ui, client)_

## README

# ai module

Multi-provider AI service supporting OpenAI, Anthropic, and Google. Handles chat completions, embeddings, streaming, usage tracking, and rate limiting.

---

## Files

| File | Purpose |
|---|---|
| `ai.service.ts` | Core service: provider selection, chat completions, embeddings, usage tracking |
| `ai.types.ts` | TypeScript types: `AIProviderType`, `ChatCompletionOptions`, `ChatCompletionResponse`, `AIModel` |
| `ai.setting.keys.ts` | Setting key constants for API keys and model configuration |
| `providers/base.provider.ts` | Abstract base class all providers extend |
| `providers/openai.provider.ts` | OpenAI implementation (GPT-4, GPT-4o, etc.) |
| `providers/anthropic.provider.ts` | Anthropic implementation (Claude 3.x, Claude 4.x) |
| `providers/google.provider.ts` | Google implementation (Gemini) |
| `ui/ai.chat-box.tsx` | Chat UI component |

---

## Providers

| Provider | Key in settings | Models |
|---|---|---|
| `openai` | `AI_OPENAI_API_KEY` | gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| `anthropic` | `AI_ANTHROPIC_API_KEY` | claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5 |
| `google` | `AI_GOOGLE_API_KEY` | gemini-1.5-pro, gemini-1.5-flash |

---

## Basic Usage

```typescript
import AIService from '@/modules/ai/ai.service';

// Chat completion
const response = await AIService.chat({
  messages: [{ role: 'user', content: 'Hello' }],
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  maxTokens: 1024,
});

// response.content, response.model, response.provider, response.usage
```

---

## Rate Limiting

Rate limits are enforced via Redis per user. Exceeding the limit throws `AIRateLimitError`.

---

## Adding a New Provider

1. Extend `BaseAIProvider` in `providers/`
2. Register in `ai.service.ts` provider map
3. Add setting keys in `ai.setting.keys.ts`

---

## Usage tracking & audit (NEW)

Every successful `chat`, `chatStream`, and `embed` call now writes both:

1. The legacy Redis daily counter (`ai:usage:<tenantId>:<provider>:<YYYY-MM-DD>`) — preserved for backwards compatibility.
2. A monthly `TenantUsage.aiTokens` counter via `TenantUsageService.incrementAiTokens(tenantId, response.usage?.totalTokens)`. This is what billing / quota enforcement reads.
3. A per-call `AiUsageLog` row (`modules/ai/entities/ai_usage_log.entity.ts`) with `provider`, `model`, `kind` (chat/stream/embed), `inputTokens`, `outputTokens`, `totalTokens`, `costUsd?`, `createdAt`. The row is the source of truth for "which model did what" reports.

All audit writes are best-effort — a DB hiccup never breaks the provider response.
