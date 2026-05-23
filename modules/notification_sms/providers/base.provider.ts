export interface SMSOptions {
  to: string;
  body: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Tenant-aware SMS provider contract.
 *
 * Every method takes the resolved `tenantId` as its first argument so each
 * tenant can store its own Twilio / Nexmo / Clickatell / NetGSM credentials
 * in its `settings` table. Providers fall back to `env.*` when a tenant has
 * not configured the matching key.
 */
export default abstract class BaseSMSProvider {
  abstract readonly name: string;

  /** Send an SMS using credentials resolved for the given tenant. */
  abstract sendShortMessage(tenantId: string, options: SMSOptions): Promise<SMSResult>;

  /**
   * Whether the provider has the minimum credentials it needs for the given
   * tenant. Implementations consult SettingService(tenantId) first, then
   * `env.*` as a fallback.
   */
  abstract isConfigured(tenantId: string): Promise<boolean>;
}
