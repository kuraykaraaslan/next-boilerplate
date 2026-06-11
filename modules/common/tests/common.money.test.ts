import { describe, it, expect } from 'vitest';
import { AppError, ErrorCode } from '../app-error';
import { addMoney, formatMoney, money, multiplyMoney, subtractMoney } from '../common.money';

describe('formatMoney', () => {
  it('formats USD with two minor units', () => {
    expect(formatMoney(money(1234.5, 'USD'), 'en-US')).toBe('$1,234.50');
  });

  it('formats JPY with zero minor units', () => {
    // JPY has no decimal places; Intl rounds to whole yen.
    expect(formatMoney(money(1234, 'JPY'), 'en-US')).toBe('¥1,234');
  });

  it('formats TRY in the tr-TR locale', () => {
    const out = formatMoney(money(1234.5, 'TRY'), 'tr-TR');
    expect(out).toContain('₺');
    expect(out).toContain('1.234,50');
  });
});

describe('money arithmetic', () => {
  it('adds same-currency amounts', () => {
    expect(addMoney(money(10, 'USD'), money(5, 'USD'))).toEqual(money(15, 'USD'));
  });

  it('subtracts same-currency amounts', () => {
    expect(subtractMoney(money(10, 'USD'), money(4, 'USD'))).toEqual(money(6, 'USD'));
  });

  it('multiplies by a factor', () => {
    expect(multiplyMoney(money(10, 'USD'), 3)).toEqual(money(30, 'USD'));
  });

  it('throws CURRENCY_MISMATCH (422) on add across currencies', () => {
    try {
      addMoney(money(10, 'USD'), money(5, 'EUR'));
      expect.fail('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(422);
      expect((error as AppError).code).toBe(ErrorCode.CURRENCY_MISMATCH);
    }
  });

  it('throws CURRENCY_MISMATCH on subtract across currencies', () => {
    expect(() => subtractMoney(money(10, 'USD'), money(5, 'GBP'))).toThrow(AppError);
  });
});
