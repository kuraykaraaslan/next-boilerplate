import { randomUUID } from 'node:crypto';
import ESignatureProviderService from './e_signature.provider.service';
import { CHALLENGE_TTL_SECONDS } from './e_signature.constants';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';
import type { TransactionRecord } from './e_signature.types';
import type { InitiateLoginParams, InitiateLoginResult } from './e_signature.workflow.types';
import { generateChallenge, resolveTenantCredentials, saveTransaction } from './e_signature.workflow.helpers';

export async function initiateLogin(params: InitiateLoginParams): Promise<InitiateLoginResult> {
  const provider = ESignatureProviderService.resolveProvider({
    country: params.country,
    providerOverride: params.providerOverride,
  });

  const validation = provider.validateIdentifier(params.identifier, params.country);
  if (!validation.ok) {
    throw new AppError(validation.error || E_SIGNATURE_MESSAGES.IDENTIFIER_INVALID, 422, ErrorCode.VALIDATION_ERROR);
  }
  const normalizedIdentifier = validation.normalized ?? params.identifier;

  if (!provider.hasCapability('login')) {
    throw new AppError(E_SIGNATURE_MESSAGES.PROVIDER_CAPABILITY_MISSING, 422, ErrorCode.VALIDATION_ERROR);
  }

  const challenge = generateChallenge();
  const transactionId = randomUUID();
  const now = Math.floor(Date.now() / 1000);

  const credentials = params.tenantId
    ? await resolveTenantCredentials(provider.name, params.tenantId)
    : undefined;

  const providerResult = await provider.initiateLogin({
    identifier: normalizedIdentifier,
    challenge,
    credentials,
  });

  const record: TransactionRecord = {
    transactionId,
    providerName: provider.name,
    providerTxnId: providerResult.providerTxnId,
    country: params.country,
    identifier: normalizedIdentifier,
    challenge,
    ip: params.ip,
    ua: params.ua,
    status: 'pending',
    purpose: params.purpose,
    initiatingUserId: params.initiatingUserId ?? null,
    tenantId: params.tenantId ?? null,
    createdAt: now,
    expiresAt: now + CHALLENGE_TTL_SECONDS,
  };
  await saveTransaction(record, CHALLENGE_TTL_SECONDS);

  return {
    transactionId,
    expiresIn: CHALLENGE_TTL_SECONDS,
    displayCode: providerResult.displayCode,
    providerName: provider.name,
  };
}
