import { createHash } from 'node:crypto';

// PII-ish metadata keys scrubbed during right-to-erasure anonymization. Kept as
// a small constant so the policy is auditable in one place.
const PII_METADATA_KEYS = ['email', 'name', 'fullName', 'firstName', 'lastName', 'phone', 'reason', 'ip', 'ipAddress'] as const;

/** Recursively sort object keys so JSON.stringify is order-independent. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => canonicalize(v));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/**
 * Deterministic SHA-256 over the canonical row content chained to prevHash.
 * Canonicalization sorts metadata keys so the same logical row always hashes
 * identically regardless of key insertion order.
 */
export function computeRowHash(
  prevHash: string | null,
  row: {
    tenantId: string;
    actorId: string | null;
    actorType: string;
    onBehalfOfActorId: string | null;
    action: string;
    severity: string;
    resourceType: string | null;
    resourceId: string | null;
    metadata: unknown;
    createdAt: Date;
  },
): string {
  const canonical = JSON.stringify({
    tenantId: row.tenantId,
    actorId: row.actorId,
    actorType: row.actorType,
    onBehalfOfActorId: row.onBehalfOfActorId,
    action: row.action,
    severity: row.severity,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    metadata: canonicalize(row.metadata),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  });
  return createHash('sha256').update((prevHash ?? '') + canonical).digest('hex');
}

/**
 * Consent-aware metadata scrubbing: strip common PII keys (recursively) while
 * preserving structural/non-PII fields. Applied during anonymizeActor.
 */
export function scrubMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const piiSet = new Set<string>(PII_METADATA_KEYS as readonly string[]);
  const scrub = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(scrub);
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (piiSet.has(k)) continue; // drop PII key entirely
        out[k] = scrub(v);
      }
      return out;
    }
    return value;
  };
  return scrub(metadata) as Record<string, unknown>;
}
