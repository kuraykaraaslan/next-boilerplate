import { randomBytes } from 'node:crypto';
import { env } from '@/modules/env';
import redis from '@/modules/redis';
import ESignatureSettingsService from './e_signature.settings.service';
import { ProviderCredentials } from './providers/base.provider';
import {
  CHALLENGE_DISPLAY_MAX_LENGTH,
  TRANSACTION_REDIS_PREFIX,
} from './e_signature.constants';
import type { TransactionRecord } from './e_signature.types';
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
  const get = (key: Parameters<typeof ESignatureSettingsService.getTenantInternal>[1]) =>
    ESignatureSettingsService.getTenantInternal(tenantId, key);

  switch (providerName) {
    case 'mobil_imza_aggregator': {
      const [apiKey, customerCode] = await Promise.all([
        get('mobilImzaAggregatorApiKey'),
        get('mobilImzaAggregatorCustomerCode'),
      ]);
      if (!apiKey && !customerCode) return undefined;
      return { apiKey: apiKey ?? undefined, customerCode: customerCode ?? undefined };
    }
    case 'smart_id': {
      const [baseUrl, uuid, name] = await Promise.all([
        get('smartIdBaseUrl'),
        get('smartIdRelyingPartyUuid'),
        get('smartIdRelyingPartyName'),
      ]);
      if (!baseUrl && !uuid && !name) return undefined;
      const extra: Record<string, string> = {};
      if (uuid) extra.relyingPartyUuid = uuid;
      if (name) extra.relyingPartyName = name;
      return {
        baseUrl: baseUrl ?? undefined,
        extra: Object.keys(extra).length ? extra : undefined,
      };
    }
    case 'bankid_se': {
      const baseUrl = await get('bankIdSeBaseUrl');
      if (!baseUrl) return undefined;
      return { baseUrl };
    }
    case 'login_gov': {
      const [clientId, redirectUri] = await Promise.all([
        get('loginGovClientId'),
        get('loginGovRedirectUri'),
      ]);
      if (!clientId && !redirectUri) return undefined;
      const extra: Record<string, string> = {};
      if (clientId) extra.clientId = clientId;
      if (redirectUri) extra.redirectUri = redirectUri;
      return { extra };
    }
    default:
      return undefined;
  }
}

export function loaRank(loa: LoA): number {
  return { low: 1, substantial: 2, high: 3 }[loa];
}
