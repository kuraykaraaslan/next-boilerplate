// SMTP mail provider (sandboxed). A V8 isolate can't open TCP sockets, so the actual
// SMTP send runs in the host `smtp` capability (nodemailer); the plugin only resolves
// the non-secret transport config and orchestrates. The password is read host-side
// from the plugin secret. Ported from the built-in mail_smtp adapter.
globalThis.__plugin = {
  providers: {
    'mail:provider': {
      sendMail: async ({ options }, host) => {
        const o = options || {};
        const smtpHost = await host.settings.get('smtpHost');
        const user = await host.settings.get('smtpUsername');
        if (!smtpHost || !user) return { success: false, error: 'SMTP provider is not configured' };
        const port = Number(await host.settings.get('smtpPort')) || 587;
        const secureSetting = await host.settings.get('smtpSecure');
        const secure = secureSetting ? secureSetting === 'true' : port === 465;
        try {
          const r = await host.smtp.send(
            { host: smtpHost, port, secure, user, passwordSecret: 'smtpPassword' },
            {
              from: o.from, to: o.to, subject: o.subject, html: o.html,
              replyTo: o.replyTo, cc: o.cc, bcc: o.bcc, attachments: o.attachments,
            },
          );
          return { success: true, messageId: r && r.messageId ? r.messageId : undefined };
        } catch (e) {
          return { success: false, error: e && e.message ? e.message : 'SMTP send failed' };
        }
      },
    },
  },
};
