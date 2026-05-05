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
