import crypto from 'crypto';

/** HMAC-SHA256 signature over `body`, prefixed `sha256=` (Stripe-style). */
export function signPayload(secret: string, body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

/** Generate a fresh 256-bit webhook signing secret (hex). */
export function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}
