import BaseSMSProvider, { type SMSOptions, type SMSResult } from './base.provider';

type Invoke = (op: string, input: unknown) => Promise<unknown>;

/**
 * Host-facing facade that runs an SMS provider as a SANDBOXED community plugin.
 * `sendShortMessage` forwards JSON-in/JSON-out into the isolate via a tenant-bound
 * `invoke`; the provider's API credentials (Twilio auth token, Nexmo secret, …) live
 * host-side in the broker and are injected via {{secret:…}} — they never enter the
 * isolate. `name` + `configured` come from the manifest metadata / bridge.
 */
export class IsolatedSmsProvider extends BaseSMSProvider {
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

  async sendShortMessage(_tenantId: string, options: SMSOptions): Promise<SMSResult> {
    return (await this.invoke('sendShortMessage', { options })) as SMSResult;
  }
}
