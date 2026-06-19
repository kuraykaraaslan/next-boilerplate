// AWS SES mail provider (sandboxed). SES Query API (SendEmail) with AWS SigV4. The
// signing-key chain + payload hashes run via host.crypto.hmac/hash; the secret access
// key never enters the isolate (first HMAC keys off it host-side). Ported from the
// built-in mail_ses adapter. (SendEmail has no attachments — same as the original.)
globalThis.__plugin = {
  providers: {
    'mail:provider': {
      sendMail: async ({ options }, host) => {
        const o = options || {};
        const accessKeyId = await host.settings.get('awsSesAccessKeyId');
        const region = (await host.settings.get('awsSesRegion')) || 'us-east-1';
        if (!accessKeyId) return { success: false, error: 'AWS SES provider is not configured' };

        const hostName = 'email.' + region + '.amazonaws.com';
        const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = amzDate.slice(0, 8);

        const parts = [];
        const add = (k, v) => { if (v != null) parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v)); };
        add('Action', 'SendEmail');
        add('Source', o.from);
        add('Destination.ToAddresses.member.1', o.to);
        add('Message.Subject.Data', o.subject);
        add('Message.Body.Html.Data', o.html);
        add('Version', '2010-12-01');
        if (o.replyTo) add('ReplyToAddresses.member.1', o.replyTo);
        (o.cc || []).forEach((e, i) => add('Destination.CcAddresses.member.' + (i + 1), e));
        (o.bcc || []).forEach((e, i) => add('Destination.BccAddresses.member.' + (i + 1), e));
        const body = parts.join('&');

        const payloadHash = await host.crypto.hash([{ value: body, encoding: 'utf8' }], { algorithm: 'sha256', outputEncoding: 'hex' });
        const canonicalRequest = ['POST', '/', '', 'content-type:application/x-www-form-urlencoded', 'host:' + hostName, 'x-amz-date:' + amzDate, '', 'content-type;host;x-amz-date', payloadHash].join('\n');
        const crHash = await host.crypto.hash([{ value: canonicalRequest, encoding: 'utf8' }], { algorithm: 'sha256', outputEncoding: 'hex' });
        const credentialScope = dateStamp + '/' + region + '/ses/aws4_request';
        const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, crHash].join('\n');

        const kDate = await host.crypto.hmac(dateStamp, { secretName: 'awsSesSecretAccessKey', prefix: 'AWS4', algorithm: 'sha256', encoding: 'hex' });
        const kRegion = await host.crypto.hmac(region, { key: { value: kDate, encoding: 'hex' }, encoding: 'hex' });
        const kService = await host.crypto.hmac('ses', { key: { value: kRegion, encoding: 'hex' }, encoding: 'hex' });
        const kSigning = await host.crypto.hmac('aws4_request', { key: { value: kService, encoding: 'hex' }, encoding: 'hex' });
        const signature = await host.crypto.hmac(stringToSign, { key: { value: kSigning, encoding: 'hex' }, encoding: 'hex' });

        const authHeader = 'AWS4-HMAC-SHA256 Credential=' + accessKeyId + '/' + credentialScope +
          ', SignedHeaders=content-type;host;x-amz-date, Signature=' + signature;
        try {
          const res = await host.http.fetch('https://' + hostName + '/', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-amz-date': amzDate, authorization: authHeader },
            body,
          });
          if (res.status === 200) {
            const m = String(res.body).match(/<MessageId>(.+?)<\/MessageId>/);
            return { success: true, messageId: m ? m[1] : undefined };
          }
          return { success: false, error: 'AWS SES error ' + res.status + ': ' + String(res.body).slice(0, 200) };
        } catch (e) {
          return { success: false, error: e && e.message ? e.message : 'SES request failed' };
        }
      },
    },
  },
};
