import { describe, it, expect } from 'vitest';
import { AppError, ErrorCode, isRetryable, statusCodeFor, toErrorResponse } from '../app-error';

describe('AppError', () => {
  it('keeps the 3-arg constructor backward compatible (retryable defaults false)', () => {
    const err = new AppError('boom', 404, ErrorCode.NOT_FOUND);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe(ErrorCode.NOT_FOUND);
    expect(err.retryable).toBe(false);
  });

  it('accepts a retryable option', () => {
    const err = new AppError('temp', 503, ErrorCode.INTERNAL_ERROR, { retryable: true });
    expect(err.retryable).toBe(true);
  });

  it('includes retryable in toJSON()', () => {
    const err = new AppError('temp', 503, ErrorCode.RATE_LIMIT_EXCEEDED, { retryable: true });
    expect(err.toJSON()).toEqual({
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'temp',
      retryable: true,
    });
  });

  it('exposes the new i18n/jurisdiction error codes', () => {
    expect(ErrorCode.UNSUPPORTED_CURRENCY).toBe('UNSUPPORTED_CURRENCY');
    expect(ErrorCode.UNSUPPORTED_LOCALE).toBe('UNSUPPORTED_LOCALE');
    expect(ErrorCode.UNSUPPORTED_TIMEZONE).toBe('UNSUPPORTED_TIMEZONE');
    expect(ErrorCode.COUNTRY_RESTRICTED).toBe('COUNTRY_RESTRICTED');
    expect(ErrorCode.TAX_JURISDICTION_ERROR).toBe('TAX_JURISDICTION_ERROR');
    expect(ErrorCode.CURRENCY_MISMATCH).toBe('CURRENCY_MISMATCH');
  });
});

describe('statusCodeFor', () => {
  it('returns the AppError status code', () => {
    expect(statusCodeFor(new AppError('x', 409, ErrorCode.CONFLICT))).toBe(409);
  });

  it('returns 500 for non-AppError values', () => {
    expect(statusCodeFor(new Error('plain'))).toBe(500);
    expect(statusCodeFor('nope')).toBe(500);
  });
});

describe('isRetryable', () => {
  it('reflects the AppError retryable flag', () => {
    expect(isRetryable(new AppError('x', 503, ErrorCode.INTERNAL_ERROR, { retryable: true }))).toBe(true);
    expect(isRetryable(new AppError('x', 400, ErrorCode.VALIDATION_ERROR))).toBe(false);
  });

  it('returns false for non-AppError values', () => {
    expect(isRetryable(new Error('plain'))).toBe(false);
    expect(isRetryable(null)).toBe(false);
  });
});

describe('toErrorResponse', () => {
  it('maps AppError through toJSON', () => {
    expect(toErrorResponse(new AppError('boom', 404, ErrorCode.NOT_FOUND))).toEqual({
      code: ErrorCode.NOT_FOUND,
      message: 'boom',
      retryable: false,
    });
  });

  it('maps a plain Error to INTERNAL_ERROR', () => {
    expect(toErrorResponse(new Error('oops'))).toEqual({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'oops',
    });
  });
});
