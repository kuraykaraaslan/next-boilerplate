// Postmark mail provider (sandboxed). JSON REST; the server token is injected
// host-side via {{secret:postmarkApiKey}}. Attachments arrive base64. Ported from
// the built-in mail_postmark adapter.
globalThis.__plugin = {
  providers: {
    'mail:provider': {
      sendMail: async ({ options }, host) => {
        const o = options || {};
        const payload = { From: o.from, To: o.to, Subject: o.subject, HtmlBody: o.html };
        if (o.replyTo) payload.ReplyTo = o.replyTo;
        if (o.cc && o.cc.length) payload.Cc = o.cc.join(',');
        if (o.bcc && o.bcc.length) payload.Bcc = o.bcc.join(',');
        if (o.attachments && o.attachments.length) {
          payload.Attachments = o.attachments.map((a) => ({ Name: a.filename, Content: a.contentBase64, ContentType: a.contentType || 'application/octet-stream' }));
        }
        try {
          const res = await host.http.fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: { 'X-Postmark-Server-Token': '{{secret:postmarkApiKey}}', 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify(payload),
          });
          const d = res.body ? JSON.parse(res.body) : {};
          if (res.status === 200 && d.ErrorCode === 0) return { success: true, messageId: d.MessageID };
          return { success: false, error: d.Message || ('Postmark error ' + res.status) };
        } catch (e) {
          return { success: false, error: e && e.message ? e.message : 'Postmark request failed' };
        }
      },
    },
  },
};
