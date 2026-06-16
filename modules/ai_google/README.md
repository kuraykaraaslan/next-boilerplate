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
