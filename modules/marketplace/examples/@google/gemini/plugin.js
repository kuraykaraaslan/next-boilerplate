// @google/google — Google Gemini provider plugin. Sandboxed; egress locked to
// generativelanguage.googleapis.com. The key is passed via the x-goog-api-key header
// (not the ?key= query param) so the broker can inject {{secret:apiKey}} host-side —
// the broker substitutes secrets in headers/body, not the URL.

globalThis.__plugin = {
  providers: {
    'ai:provider': {
      listModels: async () => [
        'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b',
      ],

      chat: async (opts, host) => {
        const model = opts.model || 'gemini-2.0-flash';
        // Gemini: roles are 'user' | 'model'; system goes in systemInstruction.
        const contents = [];
        let system = opts.systemPrompt;
        for (const m of opts.messages || []) {
          if (m.role === 'system') { system = system || m.content; continue; }
          contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
        }

        const res = await host.http.fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': '{{secret:apiKey}}' },
            body: JSON.stringify({
              contents,
              systemInstruction: system ? { parts: [{ text: system }] } : undefined,
              generationConfig: {
                temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.7,
                maxOutputTokens: opts.maxTokens || 1024,
                topP: typeof opts.topP === 'number' ? opts.topP : 1,
              },
            }),
          },
        );
        if (res.status >= 400) throw new Error('google api ' + res.status + ': ' + String(res.body).slice(0, 300));
        const data = JSON.parse(res.body);
        const cand = (data.candidates && data.candidates[0]) || {};
        const content = ((cand.content && cand.content.parts) || []).map((p) => p.text).join('');
        const um = data.usageMetadata;
        return {
          content,
          model: data.modelVersion || model,
          provider: 'google',
          usage: um ? {
            promptTokens: um.promptTokenCount,
            completionTokens: um.candidatesTokenCount,
            totalTokens: um.totalTokenCount,
          } : undefined,
          finishReason: cand.finishReason,
        };
      },

      embed: async (opts, host) => {
        const model = opts.model || 'text-embedding-004';
        const inputs = Array.isArray(opts.input) ? opts.input : [opts.input];
        const embeddings = [];
        for (const input of inputs) {
          const res = await host.http.fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':embedContent',
            {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'x-goog-api-key': '{{secret:apiKey}}' },
              body: JSON.stringify({ content: { parts: [{ text: input }] } }),
            },
          );
          if (res.status >= 400) throw new Error('google api ' + res.status + ': ' + String(res.body).slice(0, 300));
          const data = JSON.parse(res.body);
          embeddings.push(((data.embedding && data.embedding.values)) || []);
        }
        return { embeddings, model, provider: 'google' };
      },
    },
  },
};
