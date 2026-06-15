import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I

/** Generate a display gift-card code like `GC-7K4M-9PQ2-XR3T` (3 groups of 4). */
export function generateGiftCardCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < 3; g++) {
    let group = '';
    const bytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) group += ALPHABET[bytes[i] % ALPHABET.length];
    groups.push(group);
  }
  return `GC-${groups.join('-')}`;
}

/** SHA-256 hash of the (uppercased, trimmed) raw code — the lookup key. */
export function hashGiftCardCode(rawCode: string): string {
  return crypto.createHash('sha256').update(rawCode.toUpperCase().trim()).digest('hex');
}
