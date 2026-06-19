// SendGrid mail provider (sandboxed). JSON REST; the API key is injected host-side
// as a Bearer token via {{secret:sendgridApiKey}}. Attachments arrive base64. Ported
// from the built-in mail_sendgrid adapter.
globalThis.__plugin = {
  providers: {
    'mail:provider': {
      sendMail: async ({ options }, host) => {
        const o = options || {};
        const personalization = { to: [{ email: o.to }] };
        if (o.cc && o.cc.length) personalization.cc = o.cc.map((email) => ({ email }));
        if (o.bcc && o.bcc.length) personalization.bcc = o.bcc.map((email) => ({ email }));
        const payload = {
          personalizations: [personalization],
          from: { email: o.from },
          subject: o.subject,
          content: [{ type: 'text/html', value: o.html }],
        };
        if (o.replyTo) payload.reply_to = { email: o.replyTo };
        if (o.attachments && o.attachments.length) {
          payload.attachments = o.attachments.map((a) => ({ filename: a.filename, content: a.contentBase64, type: a.contentType || 'application/octet-stream' }));
        }
        try {
          const res = await host.http.fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: { authorization: 'Bearer {{secret:sendgridApiKey}}', 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.status === 202) return { success: true, messageId: res.headers && res.headers['x-message-id'] };
          return { success: false, error: 'SendGrid error ' + res.status + ': ' + String(res.body).slice(0, 200) };
        } catch (e) {
          return { success: false, error: e && e.message ? e.message : 'SendGrid request failed' };
        }
      },
    },
  },
};
