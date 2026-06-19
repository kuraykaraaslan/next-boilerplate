// Resend mail provider (sandboxed). JSON REST; the API key is injected host-side as
// a Bearer token via {{secret:resendApiKey}}. Attachments arrive base64. Ported from
// the built-in mail_resend adapter.
globalThis.__plugin = {
  providers: {
    'mail:provider': {
      sendMail: async ({ options }, host) => {
        const o = options || {};
        const payload = { from: o.from, to: [o.to], subject: o.subject, html: o.html };
        if (o.replyTo) payload.reply_to = [o.replyTo];
        if (o.cc && o.cc.length) payload.cc = o.cc;
        if (o.bcc && o.bcc.length) payload.bcc = o.bcc;
        if (o.attachments && o.attachments.length) {
          payload.attachments = o.attachments.map((a) => ({ filename: a.filename, content: a.contentBase64, content_type: a.contentType }));
        }
        try {
          const res = await host.http.fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { authorization: 'Bearer {{secret:resendApiKey}}', 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.status >= 200 && res.status < 300) return { success: true, messageId: JSON.parse(res.body).id };
          return { success: false, error: 'Resend error ' + res.status + ': ' + String(res.body).slice(0, 200) };
        } catch (e) {
          return { success: false, error: e && e.message ? e.message : 'Resend request failed' };
        }
      },
    },
  },
};
