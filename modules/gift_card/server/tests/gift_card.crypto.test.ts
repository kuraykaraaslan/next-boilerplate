import { describe, it, expect } from 'vitest';
import { generateGiftCardCode, hashGiftCardCode } from '../gift_card.crypto';

describe('gift_card.crypto', () => {
  it('generates codes in the GC-XXXX-XXXX-XXXX format', () => {
    const code = generateGiftCardCode();
    expect(code).toMatch(/^GC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it('avoids ambiguous characters (0/O/1/I)', () => {
    for (let i = 0; i < 50; i++) {
      const body = generateGiftCardCode().replace('GC-', '');
      expect(body).not.toMatch(/[01OI]/);
    }
  });

  it('generates unique codes', () => {
    const set = new Set(Array.from({ length: 200 }, () => generateGiftCardCode()));
    expect(set.size).toBe(200);
  });

  it('hashes case- and whitespace-insensitively', () => {
    const a = hashGiftCardCode('GC-ABC1-DEF2-GHJ3');
    const b = hashGiftCardCode('  gc-abc1-def2-ghj3 ');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
