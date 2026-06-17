import { env } from '@kuraykaraaslan/env';

const isDev = env.NODE_ENV === 'development';

function parseHost(raw: string): { hostname: string; origin: string } {
  const withProto = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  const u = new URL(withProto);
  return { hostname: u.hostname, origin: u.origin };
}

const { hostname: APPLICATION_HOSTNAME, origin: APPLICATION_ORIGIN } = parseHost(
  env.NEXT_PUBLIC_APPLICATION_HOST ?? (isDev ? `http://localhost:${env.PORT ?? 3000}` : 'localhost'),
);

export const RP_NAME = env.NEXT_PUBLIC_APPLICATION_NAME!;
export const RP_ID = env.WEBAUTHN_RP_ID || APPLICATION_HOSTNAME;
export const ORIGIN = env.WEBAUTHN_ORIGIN ?? APPLICATION_ORIGIN;
