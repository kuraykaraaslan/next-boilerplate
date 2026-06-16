# AI — Google

- **id:** `ai_google`
- **tier:** ai
- **version:** 1.0.0
- **dir:** `modules/ai_google/`
- **tags:** ai, provider
- **icon:** `fas fa-robot`
- **hasNextLayer:** false

Google (Gemini) provider for the AI module. Contributes chat, streaming and embeddings.

## Dependencies

- **requires:** `ai`, `env`, `setting`

## README

# ai_google

Google (Gemini) provider satellite for the [`ai`](../ai) host module.

Contributes a `google` implementation into the host's `ai:provider` extension
point. See [`ai_openai`](../ai_openai) for the shared pattern.

- **Backend:** `server/providers/google.provider.ts` (+ `google.transport.ts`,
  `google.helpers.ts`).
- **Contribution:** `server/google.extension.ts`.
- **Enable/disable:** per-tenant via `module.ai_google.enabled`.

Credentials (`googleAiApiKey`, `googleDefaultModel`, `googleMaxTokens`) remain
centrally defined in `ai/server/ai.setting.keys.ts`.
