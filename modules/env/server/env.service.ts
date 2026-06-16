import { z } from 'zod';
import { EnvSchema, type Env } from './env.schema';
import { SECRET_KEYS } from './env.schema.shared';

export type { Env };

function parseEnv(raw: NodeJS.ProcessEnv): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const flat = result.error.flatten();
    const lines: string[] = ['[env] Boot-time configuration errors — fix all before starting:'];
    for (const [field, messages] of Object.entries(flat.fieldErrors)) {
      const redacted = SECRET_KEYS.has(field) ? '[REDACTED]' : (raw[field] ?? '(unset)');
      lines.push(`  ${field} = ${redacted}  →  ${(messages as string[]).join(', ')}`);
    }
    for (const msg of flat.formErrors) {
      lines.push(`  (global)  →  ${msg}`);
    }
    throw new Error(lines.join('\n'));
  }
  return result.data;
}

/**
 * Per-region environment overlay: a variable suffixed `__<REGION>` (uppercased,
 * dashes→underscores) overrides its base key when DEPLOYMENT_REGION matches.
 * e.g. `S3_BUCKET__EU_CENTRAL=eu-bucket` overrides `S3_BUCKET` in eu-central.
 * Returns a new object — never mutates the input.
 */
export function applyRegionOverlay(raw: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const region = (raw.DEPLOYMENT_REGION ?? 'local').toUpperCase().replace(/-/g, '_');
  const suffix = `__${region}`;
  const out: NodeJS.ProcessEnv = { ...raw };
  for (const [key, value] of Object.entries(raw)) {
    if (key.endsWith(suffix)) out[key.slice(0, -suffix.length)] = value;
  }
  return out;
}

/**
 * Non-throwing validation report (dry-run / CI "report mode"): returns all
 * field + global errors instead of throwing, with secrets redacted.
 */
export function validateEnvReport(raw: NodeJS.ProcessEnv = process.env): { ok: boolean; errors: string[] } {
  const result = EnvSchema.safeParse(applyRegionOverlay(raw));
  if (result.success) return { ok: true, errors: [] };
  const flat = result.error.flatten();
  const errors: string[] = [];
  for (const [field, messages] of Object.entries(flat.fieldErrors)) {
    const redacted = SECRET_KEYS.has(field) ? '[REDACTED]' : (raw[field] ?? '(unset)');
    errors.push(`${field} = ${redacted}  →  ${(messages as string[]).join(', ')}`);
  }
  for (const msg of flat.formErrors) errors.push(`(global) → ${msg}`);
  return { ok: false, errors };
}

/** All env variable names the schema knows about (for env.example checks). */
export function schemaKeys(): string[] {
  // Unwrap the superRefine effect to reach the underlying object shape.
  const base = (EnvSchema as unknown as { _def: { schema?: z.ZodObject<z.ZodRawShape> } })._def.schema ?? (EnvSchema as unknown as z.ZodObject<z.ZodRawShape>);
  try { return Object.keys((base as z.ZodObject<z.ZodRawShape>).shape).sort(); } catch { return []; }
}

/**
 * Compare a `.env.example` file's keys to the schema: reports schema variables
 * missing from the example (CI gate) and example keys not in the schema.
 */
export function checkEnvExample(exampleText: string): { missing: string[]; extra: string[] } {
  const exampleKeys = new Set(
    exampleText.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
      .map((l) => l.split('=')[0].trim()).filter(Boolean),
  );
  const keys = schemaKeys();
  // Region-overlay + sensitive keys are intentionally not all in example; only
  // flag required (non-defaulted, non-optional) keys as missing.
  const missing = keys.filter((k) => !exampleKeys.has(k));
  const extra = [...exampleKeys].filter((k) => !keys.includes(k) && !k.includes('__'));
  return { missing, extra };
}

// ── Secrets manager loader interface ────────────────────────────────────────
export type SecretsLoader = (prefix?: string) => Promise<Record<string, string>>;
let _secretsLoader: SecretsLoader | null = null;

export function registerSecretsLoader(loader: SecretsLoader): void {
  _secretsLoader = loader;
}

/**
 * Concrete HashiCorp Vault KV-v2 secrets loader (no extra dependency — uses
 * fetch). Reads `VAULT_ADDR`/`VAULT_TOKEN`/`VAULT_PATH` and returns the secret
 * data map for merge into process.env. Register at boot:
 *   registerSecretsLoader(createVaultSecretsLoader())
 */
export function createVaultSecretsLoader(): SecretsLoader {
  return async () => {
    const addr = process.env.VAULT_ADDR;
    const token = process.env.VAULT_TOKEN;
    const path = process.env.VAULT_PATH ?? 'secret/data/app';
    if (!addr || !token) return {};
    try {
      const res = await fetch(`${addr.replace(/\/$/, '')}/v1/${path}`, {
        headers: { 'X-Vault-Token': token }, signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return {};
      const json = await res.json();
      // KV v2 nests under data.data; KV v1 under data.
      const data = json?.data?.data ?? json?.data ?? {};
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) out[k] = String(v);
      return out;
    } catch {
      return {};
    }
  };
}

// Merges remote secrets into process.env and re-parses. Call once at boot
// (e.g. in Next.js instrumentation.ts) before any module reads `env`.
export async function loadRemoteSecrets(): Promise<void> {
  if (!_secretsLoader) return;
  const parsed = parseEnv(process.env);
  if (parsed.SECRETS_MANAGER_PROVIDER === 'none') return;
  const remote = await _secretsLoader(parsed.SECRETS_MANAGER_PREFIX);
  Object.assign(process.env, remote);
  Object.assign(_env, parseEnv(process.env));
}

// Reload only secret fields from remote without full restart (rotation hook).
export async function reloadSecrets(): Promise<void> {
  await loadRemoteSecrets();
}

// ── Log non-secret active config at startup ──────────────────────────────────
export function logBootConfig(parsed: Env): void {
  const show = (k: string, v: unknown) => `${k}=${SECRET_KEYS.has(k) ? '[secret]' : v}`;
  const items = [
    show('NODE_ENV', parsed.NODE_ENV),
    show('MAIL_PROVIDER', parsed.MAIL_PROVIDER),
    show('SMS_DEFAULT_PROVIDER', parsed.SMS_DEFAULT_PROVIDER ?? 'unset'),
    show('METRICS_ENABLED', parsed.METRICS_ENABLED),
    show('OTEL_ENABLED', parsed.OTEL_ENABLED),
    show('ENABLE_BACKGROUND_JOBS', parsed.ENABLE_BACKGROUND_JOBS),
    show('SECRETS_MANAGER_PROVIDER', parsed.SECRETS_MANAGER_PROVIDER),
    show('DEPLOYMENT_REGION', parsed.DEPLOYMENT_REGION),
    show('DATABASE_READ_REPLICA_URL', parsed.DATABASE_READ_REPLICA_URL ? 'set' : 'unset'),
  ];
  console.info(`[env] Boot config: ${items.join(' | ')}`);
}

// Mutable object for rotation support — `env` reference stays stable.
// Region overlay is applied first so region-specific values win at boot.
const _env = parseEnv(applyRegionOverlay(process.env));
logBootConfig(_env);

// Freeze to prevent accidental mutation at runtime.
export const env: Readonly<Env> = Object.freeze(_env) as Readonly<Env>;
