import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';

// ── Sensitive keys — encrypted at rest, masked in API responses ──────────────
export const SENSITIVE_KEYS = new Set([
  's3SecretKey', 's3AccessKey', 'mailApiKey', 'smtpPass', 'smtpPassword',
  'mailgunApiKey', 'sendgridApiKey', 'resendApiKey', 'postmarkApiKey',
  'twilioAuthToken', 'nexmoApiSecret', 'stripeSecretKey', 'stripeWebhookSecret',
  'paypalClientSecret', 'paymentSecretKey', 'openaiApiKey', 'anthropicApiKey',
  'googleAiApiKey', 'webhookSecret', 'accessTokenSecret', 'refreshTokenSecret',
  'settingsEncryptionKey', 'vapidPrivateKey', 'samlPrivateKey',
  // Invoice e-signature seal (private key + cert) and e-invoice gateway creds
  'invoiceSigningKeyPem', 'invoiceSigningCertPem',
  'fatturapaGatewayToken', 'chorusProToken', 'cfdiPacToken', 'gstIrpToken',
  'peppolAccessPointToken',
  // Payment provider secret credentials (encrypt at rest).
  'iyzicoApiKey', 'iyzicoSecretKey',
  'alipayPrivateKey', 'wechatPayPrivateKey', 'wechatPayApiV3Key',
  'yookassaSecretKey', 'cloudpaymentsApiSecret',
]);

// ── IANA timezone validation ─────────────────────────────────────────────────
function isValidIANATimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// ISO 4217 currency codes (common subset; extend as needed)
const ISO4217_CODES = new Set([
  'USD','EUR','GBP','TRY','JPY','CNY','INR','KRW','BRL','CAD','AUD','CHF',
  'SEK','NOK','DKK','PLN','CZK','HUF','RON','BGN','HRK','RSD','RUB','UAH',
  'AED','SAR','QAR','KWD','BHD','OMR','EGP','MAD','NGN','GHS','KES','ZAR',
  'MXN','COP','ARS','CLP','PEN','UYU','VEF','SGD','HKD','TWD','THB','IDR',
  'MYR','PHP','PKR','BDT','LKR','NPR','MMK','VND','KHR',
]);

function isValidISO4217(code: string): boolean {
  return ISO4217_CODES.has(code.toUpperCase());
}

// Per-key schema validation
export function validateSettingValue(key: string, value: string): void {
  if (key === 'defaultTimezone' && !isValidIANATimezone(value)) {
    throw new AppError(
      `Invalid IANA timezone: "${value}". Use a valid IANA timezone identifier (e.g. "Europe/Istanbul").`,
      400,
      ErrorCode.VALIDATION_ERROR,
    );
  }
  if ((key === 'currencyCode' || key === 'defaultCurrency') && !isValidISO4217(value)) {
    throw new AppError(
      `Invalid ISO 4217 currency code: "${value}".`,
      400,
      ErrorCode.VALIDATION_ERROR,
    );
  }
}
