import type { LoggerOptions } from 'typeorm';

export function parseDbUrl(raw: string): { url: string; schema?: string } {
  const match = raw.match(/[?&]schema=([^&]+)/);
  const schema = match?.[1];
  const url = raw.replace(/[?&]schema=[^&]+/, '').replace(/[?&]$/, '');
  return { url, schema };
}

export function typeormLogging(nodeEnv: string | undefined): LoggerOptions {
  if (process.env.TYPEORM_LOG_QUERIES === '1') return 'all';
  if (nodeEnv === 'development') return ['error', 'warn', 'schema', 'migration'];
  return ['error'];
}
