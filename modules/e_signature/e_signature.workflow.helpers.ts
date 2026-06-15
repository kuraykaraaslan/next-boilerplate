import { randomBytes } from 'node:crypto';
import { env } from '@/modules/env';
import redis from '@/modules/redis';
import { getDataSource } from '@/modules/db';
import { User as UserEntity } from '@/modules/user/entities/user.entity';
import ESignatureSettingsService from './e_signature.settings.service';
import { ProviderCredentials } from './providers/base.provider';
import {
  CHALLENGE_DISPLAY_MAX_LENGTH,
  TRANSACTION_REDIS_PREFIX,
} from './e_signature.constants';
import type { CountryCode, TransactionRecord } from './e_signature.types';
import type { LoA } from './e_signature.enums';

export function generateChallenge(): string {
  const appName = (env.APPLICATION_NAME || 'App').slice(0, 16);
  const nonce = randomBytes(6).toString('base64url');
  const text = `${appName}: ${nonce}`;
  return text.length > CHALLENGE_DISPLAY_MAX_LENGTH
    ? text.slice(0, CHALLENGE_DISPLAY_MAX_LENGTH)
    : text;
}

export function txnKey(transactionId: string): string {
  return `${TRANSACTION_REDIS_PREFIX}${transactionId}`;
}

export async function loadTransaction(transactionId: string): Promise<TransactionRecord | null> {
  const raw = await redis.get(txnKey(transactionId)).catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TransactionRecord;
  } catch {
    await redis.del(txnKey(transactionId)).catch(() => {});
    return null;
  }
}

export async function saveTransaction(record: TransactionRecord, ttlSeconds: number): Promise<void> {
  await redis.set(
    txnKey(record.transactionId),
    JSON.stringify(record),
    'EX',
    ttlSeconds,
  );
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  await redis.del(txnKey(transactionId)).catch(() => {});
}

export async function resolveTenantCredentials(
  providerName: string,
  tenantId: string,
): Promise<ProviderCredentials | undefined> {
  if (providerName !== 'mobil_imza_aggregator') return undefined;
  const [apiKey, customerCode] = await Promise.all([
    ESignatureSettingsService.getTenantInternal(tenantId, 'mobilImzaAggregatorApiKey'),
    ESignatureSettingsService.getTenantInternal(tenantId, 'mobilImzaAggregatorCustomerCode'),
  ]);
  if (!apiKey && !customerCode) return undefined;
  return {
    apiKey: apiKey ?? undefined,
    customerCode: customerCode ?? undefined,
  };
}

export function loaRank(loa: LoA): number {
  return { low: 1, substantial: 2, high: 3 }[loa];
}

export async function findUserByCountryFallback({
  country,
  identifier,
  nationalIdHash,
}: {
  country: CountryCode;
  identifier: string;
  nationalIdHash: string | null;
}): Promise<string | null> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserEntity);
  if (country === 'TR') {
    const byPhone = await repo.findOne({ where: { phone: identifier } });
    if (byPhone) return byPhone.userId;
  }
  void nationalIdHash;
  return null;
}
