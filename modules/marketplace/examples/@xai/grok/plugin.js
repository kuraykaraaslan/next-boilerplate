// @xai/xai — xAI (Grok) provider plugin (OpenAI-compatible). Sandboxed; egress
// locked to api.x.ai. The API key is injected host-side via the {{secret:apiKey}}
// placeholder (signed egress) — the isolate never sees it.

globalThis.__plugin = {
  providers: {
    'ai:provider': {
      // Live model list from GET /v1/models; falls back to the static list on any error.
      listModels: async (_input, host) => {
        const FALLBACK = ['grok-3', 'grok-3-mini', 'grok-2-1212', 'grok-2-vision-1212', 'grok-2-latest', 'grok-beta'];
        try {
          const res = await host.http.fetch('https://api.x.ai/v1/models', {
            method: 'GET', headers: { authorization: 'Bearer {{secret:apiKey}}', accept: 'application/json' },
          });
          if (!res || res.status >= 400) return FALLBACK;
          const ids = (JSON.parse(res.body).data || []).map((m) => m.id).filter(Boolean);
          return ids.length ? ids : FALLBACK;
        } catch (e) { return FALLBACK; }
      },

      chat: async (opts, host) => {
        const model = opts.model || 'grok-2-latest';
        const messages = [];
        if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
        for (const m of opts.messages || []) messages.push({ role: m.role, content: m.content });

        const res = await host.http.fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: 'Bearer {{secret:apiKey}}' },
          body: JSON.stringify({
            model,
            messages,
            temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.7,
            max_tokens: opts.maxTokens || 1024,
            top_p: typeof opts.topP === 'number' ? opts.topP : 1,
          }),
        });
        if (res.status >= 400) throw new Error('xai api ' + res.status + ': ' + String(res.body).slice(0, 300));
        const data = JSON.parse(res.body);
        const choice = (data.choices && data.choices[0]) || {};
        return {
          content: (choice.message && choice.message.content) || '',
          model: data.model || model,
          provider: 'xai',
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          } : undefined,
          finishReason: choice.finish_reason,
        };
      },

      embed: async () => { throw new Error('xai does not support embeddings'); },
    },
  },
};
