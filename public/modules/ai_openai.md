# AI — OpenAI

- **id:** `ai_openai`
- **tier:** ai
- **version:** 1.0.0
- **dir:** `modules/ai_openai/`
- **tags:** ai, provider
- **icon:** `fas fa-robot`
- **hasNextLayer:** false

OpenAI (and OpenAI-compatible) provider for the AI module. Contributes chat, streaming and embeddings.

## Dependencies

- **requires:** `ai`, `env`, `setting`

## README

# ai_openai

OpenAI provider satellite for the [`ai`](../ai) host module.

Contributes an `openai` implementation into the host's `ai:provider` extension
point (declared in `ai/module.json`). The host `AIProviderService` discovers it
through the extension registry — there is no static import of this module from
the host.

- **Backend:** `server/providers/openai.provider.ts` (+ `openai.transport.ts`,
  `openai.helpers.ts`) — the provider implementation, extending
  `@nb/ai/server/providers/base.provider`.
- **Contribution:** `server/openai.extension.ts` — the default-exported
  `AIProviderContribution` (`key`, `settingKeys`, `resolveConfig`, `create`).
- **Enable/disable:** per-tenant via module activation
  (`module.ai_openai.enabled`). Disabling removes the `openai` provider for that
  tenant with no host change.

Provider credentials/settings (`openaiApiKey`, `openaiDefaultModel`,
`openaiMaxTokens`, `openaiBaseUrl`) remain centrally defined in
`ai/server/ai.setting.keys.ts` and edited from the AI settings page; this module
references them by name in `resolveConfig`.
