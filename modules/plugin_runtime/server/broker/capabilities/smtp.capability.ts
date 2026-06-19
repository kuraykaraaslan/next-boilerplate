// smtp: HOST-SIDE raw-SMTP transport for sandboxed mail provider plugins. A V8
// isolate has no TCP sockets, so it cannot speak SMTP — it hands the (non-secret)
// transport config + message here and the broker sends via nodemailer. The SMTP
// password is read host-side from the plugin's encrypted secrets (never enters the
// isolate), mirroring the crypto.* capabilities.
import nodemailer from 'nodemailer';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { decryptFieldOpt } from '@kuraykaraaslan/common/server/field-encryption';
import type { Json } from '../../../sdk/types';
import { SECRET_PREFIX, type BrokerCtx } from '../broker.context';

interface SmtpSendConfig {
  host: string;
  port?: number;
  secure?: boolean;
  user?: string;
  /** Name of the plugin secret holding the SMTP password (decrypted host-side). */
  passwordSecret?: string;
}
interface SmtpMessage {
  from?: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{ filename: string; contentBase64: string; contentType?: string }>;
}

export const smtp = {
  async send(ctx: BrokerCtx, config: SmtpSendConfig, message: SmtpMessage): Promise<Json> {
    const c = config ?? ({} as SmtpSendConfig);
    if (!c.host) throw new Error('smtp.send: host required');
    let pass: string | undefined;
    if (c.user) {
      const raw = await SettingService.getValue(ctx.tenantId, SECRET_PREFIX(ctx.pluginId) + (c.passwordSecret ?? 'smtpPassword'));
      const dec = decryptFieldOpt(raw);
      pass = typeof dec === 'string' ? dec : undefined;
    }
    const port = Number(c.port) || 587;
    const transport = nodemailer.createTransport({
      host: c.host,
      port,
      secure: c.secure ?? port === 465,
      auth: c.user ? { user: c.user, pass: pass ?? '' } : undefined,
    });
    const m = message ?? ({} as SmtpMessage);
    const result = await transport.sendMail({
      from: m.from,
      to: m.to,
      subject: m.subject,
      html: m.html,
      replyTo: m.replyTo,
      cc: m.cc?.join(', '),
      bcc: m.bcc?.join(', '),
      attachments: m.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.contentBase64 ?? '', 'base64'),
        contentType: a.contentType,
      })),
    });
    return { messageId: result.messageId ?? null } as Json;
  },
};
