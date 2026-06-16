/**
 * Turkish tax identifier validators.
 *
 *  • TCKN (11 digits) — individual citizen ID, with checksum.
 *  • VKN  (10 digits) — corporate tax number, with checksum.
 */

export function isValidTCKN(tckn: string): boolean {
  if (!/^\d{11}$/.test(tckn)) return false;
  const digits = tckn.split('').map(Number);
  if (digits[0] === 0) return false;
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const c10 = (oddSum * 7 - evenSum) % 10;
  if (((c10 + 10) % 10) !== digits[9]) return false;
  const c11 = (digits.slice(0, 10).reduce((s, d) => s + d, 0)) % 10;
  return c11 === digits[10];
}

export function isValidVKN(vkn: string): boolean {
  if (!/^\d{10}$/.test(vkn)) return false;
  const digits = vkn.split('').map(Number);
  const last = digits[9];
  const v: number[] = [];
  for (let i = 0; i < 9; i++) {
    const tmp = (digits[i] + (9 - i)) % 10;
    v[i] = tmp === 0 ? 0 : (tmp * (2 ** (9 - i))) % 9;
    if (tmp !== 0 && v[i] === 0) v[i] = 9;
  }
  const sum = v.reduce((s, x) => s + x, 0);
  return (10 - (sum % 10)) % 10 === last;
}

/** Either TCKN or VKN. */
export function isValidTrTaxId(value: string): boolean {
  return isValidTCKN(value) || isValidVKN(value);
}
