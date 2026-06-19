// Mailgun mail provider (sandboxed). Form-encoded REST; HTTP Basic with username
// 'api' and the API key injected host-side (init.basic). Ported from the built-in
// mail_mailgun adapter. Note: binary attachments need multipart/form-data which the
// JSON/string sandbox boundary can't carry, so attachments are omitted here.
globalThis.__plugin = {
  providers: {
    'mail:provider': {
      sendMail: async ({ options }, host) => {
        const o = options || {};
        const domain = await host.settings.get('mailgunDomain');
        const region = (await host.settings.get('mailgunRegion')) || 'us';
        if (!domain) return { success: false, error: 'Mailgun provider is not configured' };
        const base = region === 'eu' ? 'https://api.eu.mailgun.net/v3' : 'https://api.mailgun.net/v3';
        const parts = [];
        const add = (k, v) => { if (v != null && v !== '') parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v)); };
        add('from', o.from); add('to', o.to); add('subject', o.subject); add('html', o.html);
        if (o.replyTo) add('h:Reply-To', o.replyTo);
        if (o.cc && o.cc.length) add('cc', o.cc.join(','));
        if (o.bcc && o.bcc.length) add('bcc', o.bcc.join(','));
        try {
          const res = await host.http.fetch(base + '/' + encodeURIComponent(domain) + '/messages', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
            basic: { username: 'api', secretName: 'mailgunApiKey' },
            body: parts.join('&'),
          });
          if (res.status === 200) return { success: true, messageId: (JSON.parse(res.body).id || '').replace(/[<>]/g, '') };
          return { success: false, error: 'Mailgun error ' + res.status + ': ' + String(res.body).slice(0, 200) };
        } catch (e) {
          return { success: false, error: e && e.message ? e.message : 'Mailgun request failed' };
        }
      },
    },
  },
};
