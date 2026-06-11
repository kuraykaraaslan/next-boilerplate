/**
 * CI check: every variable declared in env.service.ts must have a matching
 * entry in .env.example. Run with:
 *   npx tsx scripts/check-env-example.ts
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const ENV_SERVICE = path.join(ROOT, 'modules', 'env', 'env.service.ts');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');

// Extract keys from EnvSchema z.object({ ... })
function extractSchemaKeys(source: string): string[] {
  const start = source.indexOf('const EnvSchema = z.object({');
  const end = source.indexOf('}).superRefine(') !== -1
    ? source.indexOf('}).superRefine(')
    : source.indexOf('\nexport type Env');
  const body = source.slice(start, end);
  const regex = /^\s{2}([A-Z_][A-Z0-9_]+)\s*:/gm;
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(body)) !== null) keys.push(m[1]);
  return keys;
}

// Extract keys present in .env.example (commented or not)
function extractExampleKeys(source: string): Set<string> {
  const keys = new Set<string>();
  for (const line of source.split('\n')) {
    const stripped = line.replace(/^#\s*/, '').trim();
    const m = stripped.match(/^([A-Z_][A-Z0-9_]+)\s*=/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

const serviceSource = fs.readFileSync(ENV_SERVICE, 'utf-8');
const exampleSource = fs.readFileSync(ENV_EXAMPLE, 'utf-8');

const schemaKeys = extractSchemaKeys(serviceSource);
const exampleKeys = extractExampleKeys(exampleSource);

const missing = schemaKeys.filter(k => !exampleKeys.has(k));

if (missing.length === 0) {
  console.log(`[env-check] OK — all ${schemaKeys.length} schema keys are present in .env.example`);
  process.exit(0);
} else {
  console.error(`[env-check] FAIL — ${missing.length} key(s) missing from .env.example:`);
  for (const k of missing) console.error(`  - ${k}`);
  process.exit(1);
}
