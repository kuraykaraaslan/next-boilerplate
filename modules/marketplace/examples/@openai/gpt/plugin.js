// @openai/openai — OpenAI provider plugin. Runs untrusted in a V8 isolate; reaches
// the network only through host.http.fetch (egress locked to api.openai.com by the
// manifest allowlist). Never sees the API key: writes the {{secret:apiKey}}
// placeholder, the broker substitutes the tenant's decrypted secret host-side.

globalThis.__plugin = {
  providers: {
    'ai:provider': {
      listModels: async () => [
        'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o1-preview',
      ],

      chat: async (opts, host) => {
        const model = opts.model || 'gpt-4o-mini';
        const messages = [];
        if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
        for (const m of opts.messages || []) messages.push({ role: m.role, content: m.content });

        const res = await host.http.fetch('https://api.openai.com/v1/chat/completions', {
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
        if (res.status >= 400) throw new Error('openai api ' + res.status + ': ' + String(res.body).slice(0, 300));
        const data = JSON.parse(res.body);
        const choice = (data.choices && data.choices[0]) || {};
        return {
          content: (choice.message && choice.message.content) || '',
          model: data.model || model,
          provider: 'openai',
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          } : undefined,
          finishReason: choice.finish_reason,
        };
      },

      embed: async (opts, host) => {
        const model = opts.model || 'text-embedding-3-small';
        const res = await host.http.fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: 'Bearer {{secret:apiKey}}' },
          body: JSON.stringify({ model, input: opts.input }),
        });
        if (res.status >= 400) throw new Error('openai api ' + res.status + ': ' + String(res.body).slice(0, 300));
        const data = JSON.parse(res.body);
        return {
          embeddings: (data.data || []).map((d) => d.embedding),
          model: data.model || model,
          provider: 'openai',
          usage: data.usage ? { totalTokens: data.usage.total_tokens } : undefined,
        };
      },
    },
  },
};
