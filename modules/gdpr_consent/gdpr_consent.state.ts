import type { ConsentRecord } from './gdpr_consent.types';

/**
 * Derive the current consent state from an append-only ledger. For each purpose
 * the LATEST decision wins (records are sorted by `createdAt` ascending; a later
 * row supersedes an earlier one). `necessary` is strictly required and is always
 * reported as granted regardless of what the ledger says.
 *
 * Pure: no I/O, fully unit-testable.
 */
export function deriveConsentState(records: ConsentRecord[]): Record<string, boolean> {
  const sorted = [...records].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const state: Record<string, boolean> = {};
  for (const rec of sorted) {
    state[rec.purpose] = rec.granted;
  }

  // Necessary cookies are always implicitly granted.
  state.necessary = true;
  return state;
}
