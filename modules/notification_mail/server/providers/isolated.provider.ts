import BaseMailProvider, { type MailOptions, type MailResult } from './base.provider';

type Invoke = (op: string, input: unknown) => Promise<unknown>;

/**
 * Host-facing facade that runs a mail provider as a SANDBOXED community plugin.
 * `sendMail` forwards JSON-in/JSON-out into the isolate via a tenant-bound `invoke`;
 * the provider's API key / SMTP password lives host-side (broker secrets / the smtp
 * capability) and never enters the isolate. Attachment bytes cross the boundary as
 * base64. `name` + `configured` come from the manifest metadata / bridge.
 */
export class IsolatedMailProvider extends BaseMailProvider {
  readonly name: string;
  private readonly _configured: boolean;
  private readonly invoke: Invoke;

  constructor(key: string, meta: Record<string, unknown>, invoke: Invoke, configured: boolean) {
    super();
    this.name = String(meta?.label ?? key);
    this._configured = configured;
    this.invoke = invoke;
  }

  async isConfigured(): Promise<boolean> {
    return this._configured;
  }

  async sendMail(_tenantId: string, options: MailOptions): Promise<MailResult> {
    const attachments = (options.attachments ?? []).map((a) => ({
      filename: a.filename,
      contentBase64: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(String(a.content)).toString('base64'),
      contentType: a.contentType,
    }));
    return (await this.invoke('sendMail', {
      options: {
        to: options.to,
        subject: options.subject,
        html: options.html,
        from: options.from,
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments,
      },
    })) as MailResult;
  }
}
