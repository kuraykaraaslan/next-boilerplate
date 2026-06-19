// NetGSM (TR) SMS provider (sandboxed). Uses the HTTP GET send endpoint so no
// multipart body is needed in the isolate; the password is injected host-side via
// {{secret:netgsmPassword}}. Ported from the built-in sms_netgsm adapter.
globalThis.__plugin = {
  providers: {
    'sms:provider': {
      sendShortMessage: async ({ options }, host) => {
        const userCode = await host.settings.get('netgsmUserCode');
        const header = await host.settings.get('netgsmPhoneNumber');
        if (!userCode || !header) return { success: false, error: 'NetGSM provider is not configured' };
        if (!options || !options.to || !options.body) return { success: false, error: 'Missing phone number or body' };
        const q = 'usercode=' + encodeURIComponent(userCode) +
          '&password={{secret:netgsmPassword}}' +
          '&gsmno=' + encodeURIComponent(options.to) +
          '&message=' + encodeURIComponent(options.body) +
          '&msgheader=' + encodeURIComponent(header) +
          '&filter=0';
        try {
          const res = await host.http.fetch('https://api.netgsm.com.tr/sms/send/get?' + q, { method: 'GET' });
          const data = String(res.body || '').trim();
          if (res.status < 400 && (data.startsWith('00') || /^\d{9,}$/.test(data))) {
            return { success: true, messageId: data };
          }
          return { success: false, error: 'Failed response: ' + data.slice(0, 200) };
        } catch (e) {
          return { success: false, error: e && e.message ? e.message : 'NetGSM request failed' };
        }
      },
    },
  },
};
