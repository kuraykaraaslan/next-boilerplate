// @meta/meta — Meta Llama provider plugin (Llama API). Sandboxed; egress locked to
// api.llama.com. The API key is injected host-side via the {{secret:apiKey}}
// placeholder (signed egress) — the isolate never sees it. Handles both the
// OpenAI-compatible response shape and the native Llama API `completion_message`.

globalThis.__plugin = {
  providers: {
    'ai:provider': {
      // Live model list from GET /v1/models; falls back to the static list on any error.
      listModels: async (_input, host) => {
        const FALLBACK = [
          'Llama-4-Maverick-17B-128E-Instruct-FP8', 'Llama-4-Scout-17B-16E-Instruct-FP8',
          'Llama-3.3-70B-Instruct', 'Llama-3.3-8B-Instruct',
        ];
        try {
          const res = await host.http.fetch('https://api.llama.com/v1/models', {
            method: 'GET', headers: { authorization: 'Bearer {{secret:apiKey}}', accept: 'application/json' },
          });
          if (!res || res.status >= 400) return FALLBACK;
          const ids = (JSON.parse(res.body).data || []).map((m) => m.id ?? m.model ?? m).filter((x) => typeof x === 'string' && x);
          return ids.length ? ids : FALLBACK;
        } catch (e) { return FALLBACK; }
      },

      chat: async (opts, host) => {
        const model = opts.model || 'Llama-3.3-70B-Instruct';
        const messages = [];
        if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
        for (const m of opts.messages || []) messages.push({ role: m.role, content: m.content });

        const res = await host.http.fetch('https://api.llama.com/v1/chat/completions', {
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
        if (res.status >= 400) throw new Error('meta api ' + res.status + ': ' + String(res.body).slice(0, 300));
        const data = JSON.parse(res.body);

        // OpenAI-compatible shape …
        const choice = (data.choices && data.choices[0]) || null;
        // … or native Llama API `completion_message`.
        const cm = data.completion_message;
        const content = (choice && choice.message && choice.message.content)
          || (cm && cm.content && (typeof cm.content === 'string' ? cm.content : cm.content.text))
          || '';
        const usage = data.usage || (Array.isArray(data.metrics) ? null : undefined);
        return {
          content,
          model: data.model || model,
          provider: 'meta',
          usage: usage ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          } : undefined,
          finishReason: (choice && choice.finish_reason) || (cm && cm.stop_reason),
        };
      },

      embed: async () => { throw new Error('meta does not support embeddings'); },
    },
  },
};
