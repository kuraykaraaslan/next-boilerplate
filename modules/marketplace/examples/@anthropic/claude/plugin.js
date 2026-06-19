// @anthropic/anthropic — Anthropic Claude provider plugin. Sandboxed; egress locked
// to api.anthropic.com. The API key is injected host-side via the {{secret:apiKey}}
// placeholder (signed egress) — the isolate never sees it.

globalThis.__plugin = {
  providers: {
    'ai:provider': {
      // Live model list from GET /v1/models; falls back to the static list on any error.
      listModels: async (_input, host) => {
        const FALLBACK = [
          'claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219',
          'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229',
          'claude-3-sonnet-20240229', 'claude-3-haiku-20240307',
        ];
        try {
          const res = await host.http.fetch('https://api.anthropic.com/v1/models', {
            method: 'GET', headers: { 'x-api-key': '{{secret:apiKey}}', 'anthropic-version': '2023-06-01', accept: 'application/json' },
          });
          if (!res || res.status >= 400) return FALLBACK;
          const ids = (JSON.parse(res.body).data || []).map((m) => m.id).filter(Boolean);
          return ids.length ? ids : FALLBACK;
        } catch (e) { return FALLBACK; }
      },

      chat: async (opts, host) => {
        const model = opts.model || 'claude-3-5-sonnet-20241022';
        // Anthropic: system is a top-level field; messages are user/assistant only.
        const messages = [];
        let system = opts.systemPrompt;
        for (const m of opts.messages || []) {
          if (m.role === 'system') { system = system || m.content; continue; }
          messages.push({ role: m.role, content: m.content });
        }

        const res = await host.http.fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': '{{secret:apiKey}}',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            messages,
            system,
            max_tokens: opts.maxTokens || 1024,
            temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.7,
            top_p: typeof opts.topP === 'number' ? opts.topP : undefined,
          }),
        });
        if (res.status >= 400) throw new Error('anthropic api ' + res.status + ': ' + String(res.body).slice(0, 300));
        const data = JSON.parse(res.body);
        const content = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
        return {
          content,
          model: data.model || model,
          provider: 'anthropic',
          usage: data.usage ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
          } : undefined,
          finishReason: data.stop_reason,
        };
      },

      embed: async () => { throw new Error('anthropic does not support embeddings'); },
    },
  },
};
