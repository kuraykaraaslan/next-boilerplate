import type { ValueTransformer } from 'typeorm';
import { DEFAULT_CURRENCY as COMMON_DEFAULT_CURRENCY } from '@nb/common';
import type { AccountKind } from './wallet.enums';

/**
 * Default unit of account — the platform default ISO 4217 currency (single
 * sourced from `@/modules/common`). A tenant can open wallets in any currency;
 * cross-currency transfers are rejected (a transaction is single currency).
 */
export const DEFAULT_CURRENCY: string = COMMON_DEFAULT_CURRENCY;

/**
 * System contra-accounts provisioned lazily per (tenant, currency). `issue`
 * mints from SYSTEM_ISSUER, `spend` lands in SYSTEM_REVENUE, booking captures
 * sit in SYSTEM_ESCROW, fees in SYSTEM_FEE. System accounts may run negative
 * (they are the other side of every user balance); user wallets may not.
 */
export const SYSTEM_ACCOUNT_SPECS: { kind: AccountKind; allowOverdraft: boolean }[] = [
  { kind: 'SYSTEM_ISSUER', allowOverdraft: true },
  { kind: 'SYSTEM_REVENUE', allowOverdraft: true },
  { kind: 'SYSTEM_ESCROW', allowOverdraft: true },
  { kind: 'SYSTEM_FEE', allowOverdraft: true },
];

/**
 * Money is stored as integer minor units in a `bigint` column. TypeORM hands
 * `bigint` back as a JS `string`; JS `number` is unsafe past 2^53, so the
 * column value lives as a `BigInt` in memory and a decimal string on the wire.
 * Never let a float touch these columns.
 */
export const bigintTransformer: ValueTransformer = {
  to: (value?: bigint | string | null): string | null =>
    value === null || value === undefined ? null : value.toString(),
  from: (value?: string | null): bigint | null =>
    value === null || value === undefined ? null : BigInt(value),
};
