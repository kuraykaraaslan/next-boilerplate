export const PASSKEY_REG_CHALLENGE_KEY = (userId: string) => `passkey:reg:challenge:${userId}`;
export const PASSKEY_AUTH_CHALLENGE_KEY = (userId: string) => `passkey:auth:challenge:${userId}`;
export const PASSKEY_EMAIL_CHALLENGE_KEY = (email: string) => `passkey:email:challenge:${email}`;
export const PASSKEY_CHALLENGE_TTL_SECONDS = 300; // 5 minutes
export const PASSKEY_MAX_PER_USER = 10;
