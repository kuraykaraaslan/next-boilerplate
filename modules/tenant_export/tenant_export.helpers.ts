export function stripFields<T>(rows: T[], fields: string[]): object[] {
  return rows.map((row) => {
    const safe = { ...(row as unknown as Record<string, unknown>) };
    for (const f of fields) delete safe[f];
    return safe;
  });
}

const PII_FIELDS = ['email', 'phone', 'recipient', 'ipAddress', 'lastUsedIp', 'lastLoginIp', 'customerEmail'];

export function redactPiiDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactPiiDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = PII_FIELDS.includes(k) && v ? '[redacted]' : redactPiiDeep(v);
    }
    return out;
  }
  return value;
}
