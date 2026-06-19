// Nexmo/Vonage SMS provider (sandboxed). Form-encoded REST; api_secret injected
// host-side via {{secret:nexmoApiSecret}}. Ported from the built-in sms_nexmo adapter.
globalThis.__plugin = {
  providers: {
    'sms:provider': {
      sendShortMessage: async ({ options }, host) => {
        const apiKey = await host.settings.get('nexmoApiKey');
        const fromPhone = await host.settings.get('nexmoPhoneNumber');
        if (!apiKey || !fromPhone) return { success: false, error: 'Nexmo provider is not configured' };
        if (!options || !options.to || !options.body) return { success: false, error: 'Missing phone number or body' };
        const body = 'api_key=' + encodeURIComponent(apiKey) +
          '&api_secret={{secret:nexmoApiSecret}}' +
          '&to=' + encodeURIComponent(options.to) +
          '&from=' + encodeURIComponent(fromPhone) +
          '&text=' + encodeURIComponent(options.body);
        try {
          const res = await host.http.fetch('https://rest.nexmo.com/sms/json', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
            body,
          });
          if (res.status >= 400) return { success: false, error: 'Nexmo error ' + res.status };
          const d = JSON.parse(res.body);
          const m = d.messages && d.messages[0];
          if (m && m.status === '0') return { success: true, messageId: m['message-id'] };
          return { success: false, error: (m && m['error-text']) || 'Unknown error' };
        } catch (e) {
          return { success: false, error: e && e.message ? e.message : 'Nexmo request failed' };
        }
      },
    },
  },
};
