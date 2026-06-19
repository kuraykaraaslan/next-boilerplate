// @kimi/kimi — a THIRD-PARTY community AI provider plugin (Moonshot "Kimi").
// Runs untrusted in a V8 isolate; reaches the outside world only through `host.*`.
// It NEVER sees the API key: it writes the `{{secret:apiKey}}` placeholder, and the
// broker substitutes the tenant's decrypted secret host-side (signed egress), with
// egress locked to api.moonshot.ai by the manifest httpAllowlist.
//
// This is the isolate-loadable bundle: a single script assigning globalThis.__plugin.
// It implements the `ai:provider` op-set (listModels / chat / embed).

globalThis.__plugin = {
  providers: {
    'ai:provider': {
      // Live model list from GET /v1/models; falls back to the static list on any error.
      listModels: async (_input, host) => {
        const FALLBACK = ['kimi-k2-0711-preview', 'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'];
        try {
          const res = await host.http.fetch('https://api.moonshot.ai/v1/models', {
            method: 'GET', headers: { authorization: 'Bearer {{secret:apiKey}}', accept: 'application/json' },
          });
          if (!res || res.status >= 400) return FALLBACK;
          const ids = (JSON.parse(res.body).data || []).map((m) => m.id).filter(Boolean);
          return ids.length ? ids : FALLBACK;
        } catch (e) { return FALLBACK; }
      },

      chat: async (opts, host) => {
        const model = opts.model || 'moonshot-v1-8k';
        const messages = [];
        if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
        for (const m of opts.messages || []) messages.push({ role: m.role, content: m.content });

        const res = await host.http.fetch('https://api.moonshot.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: 'Bearer {{secret:apiKey}}', // substituted host-side
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.6,
            max_tokens: opts.maxTokens || 1024,
            top_p: typeof opts.topP === 'number' ? opts.topP : undefined,
          }),
        });
        if (res.status >= 400) throw new Error('kimi api ' + res.status + ': ' + String(res.body).slice(0, 300));
        const data = JSON.parse(res.body);
        const choice = (data.choices && data.choices[0]) || {};
        return {
          content: (choice.message && choice.message.content) || '',
          model: data.model || model,
          provider: 'kimi',
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          } : undefined,
          finishReason: choice.finish_reason,
        };
      },

      embed: async () => { throw new Error('kimi does not support embeddings'); },
    },
  },
};
