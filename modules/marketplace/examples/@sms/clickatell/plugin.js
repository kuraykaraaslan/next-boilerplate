// Clickatell SMS provider (sandboxed). JSON REST; the API key is injected host-side
// as a Bearer token via {{secret:clickatellApiKey}}. Ported from the built-in
// sms_clickatell adapter.
globalThis.__plugin = {
  providers: {
    'sms:provider': {
      sendShortMessage: async ({ options }, host) => {
        if (!options || !options.to || !options.body) return { success: false, error: 'Missing phone number or body' };
        try {
          const res = await host.http.fetch('https://platform.clickatell.com/messages/chat', {
            method: 'POST',
            headers: { authorization: 'Bearer {{secret:clickatellApiKey}}', 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ content: options.body, to: [options.to] }),
          });
          if (res.status === 202) {
            const d = JSON.parse(res.body);
            return { success: true, messageId: d.messages && d.messages[0] && d.messages[0].apiMessageId };
          }
          return { success: false, error: 'Clickatell error ' + res.status + ': ' + String(res.body).slice(0, 200) };
        } catch (e) {
          return { success: false, error: e && e.message ? e.message : 'Clickatell request failed' };
        }
      },
    },
  },
};
