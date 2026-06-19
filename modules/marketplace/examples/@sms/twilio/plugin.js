// Twilio SMS provider (sandboxed). Form-encoded REST; HTTP Basic with the Account
// SID as username and the auth token injected host-side (init.basic). Ported from
// the built-in sms_twilio adapter.
globalThis.__plugin = {
  providers: {
    'sms:provider': {
      sendShortMessage: async ({ options }, host) => {
        const accountSid = await host.settings.get('twilioAccountSid');
        const fromPhone = await host.settings.get('twilioPhoneNumber');
        if (!accountSid || !fromPhone) return { success: false, error: 'Twilio provider is not configured' };
        if (!options || !options.to || !options.body) return { success: false, error: 'Missing phone number or body' };
        const body = 'From=' + encodeURIComponent(fromPhone) + '&To=' + encodeURIComponent(options.to) + '&Body=' + encodeURIComponent(options.body);
        try {
          const res = await host.http.fetch('https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(accountSid) + '/Messages.json', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
            basic: { username: accountSid, secretName: 'twilioAuthToken' },
            body,
          });
          if (res.status === 201) return { success: true, messageId: JSON.parse(res.body).sid };
          return { success: false, error: 'Twilio error ' + res.status + ': ' + String(res.body).slice(0, 200) };
        } catch (e) {
          return { success: false, error: e && e.message ? e.message : 'Twilio request failed' };
        }
      },
    },
  },
};
