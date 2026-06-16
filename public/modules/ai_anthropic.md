# AI — Anthropic

- **id:** `ai_anthropic`
- **tier:** ai
- **version:** 1.0.0
- **dir:** `modules/ai_anthropic/`
- **tags:** ai, provider
- **icon:** `fas fa-robot`
- **hasNextLayer:** false

Anthropic (Claude) provider for the AI module. Contributes chat and streaming.

## Dependencies

- **requires:** `ai`, `env`, `setting`

## README

# ai_anthropic

Anthropic (Claude) provider satellite for the [`ai`](../ai) host module.

Contributes an `anthropic` implementation into the host's `ai:provider`
extension point. See [`ai_openai`](../ai_openai) for the shared pattern.

- **Backend:** `server/providers/anthropic.provider.ts`.
- **Contribution:** `server/anthropic.extension.ts`.
- **Enable/disable:** per-tenant via `module.ai_anthropic.enabled`.

Credentials (`anthropicApiKey`, `anthropicDefaultModel`, `anthropicMaxTokens`)
remain centrally defined in `ai/server/ai.setting.keys.ts`.
