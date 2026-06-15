import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import {
  CheckoutSessionParams,
  CheckoutSessionResult,
  DirectChargeParams,
  DirectChargeResult,
  ThreeDSInitParams,
  ThreeDSInitResult,
  ThreeDSCompleteParams,
  PaymentIntentParams,
  PaymentIntentResult,
} from './providers/base.provider';
import { PaymentProvider } from './payment.enums';
import { GetProviderStatusDTO } from './payment.dto';
import { PAYMENT_MESSAGES } from './payment.messages';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { getProvider, resolveEnabledProvider } from './payment.checkout.registry';
import AgreementService from '@/modules/terms_consent/terms_consent.agreements.service';

export async function createCustomerPortalSession(
  tenantId: string,
  params: {
    provider?: PaymentProvider;
    customerEmail?: string;
    customerExternalId?: string;
    returnUrl: string;
  },
): Promise<{ url: string | null; note?: string; provider: string }> {
  const provider = getProvider(params.provider);
  const result = await provider.createCustomerPortalSession(tenantId, {
    customerExternalId: params.customerExternalId,
    customerEmail: params.customerEmail,
    returnUrl: params.returnUrl,
  });
  return { ...result, provider: provider.name };
}

/** Reject card-testing / runaway checkout creation per customer (fraud guard). */
async function assertCheckoutVelocity(tenantId: string, identifier?: string): Promise<void> {
  if (!identifier) return;
  const key = `pay:velocity:${tenantId}:${identifier}`;
  try {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, 600);
    if (n > 10) throw new AppError('Too many payment attempts. Please wait a few minutes.', 429, ErrorCode.RATE_LIMIT_EXCEEDED);
  } catch (err) {
    if (err instanceof AppError) throw err; // Redis errors fail open
  }
}

export async function createCheckoutSession(
  tenantId: string,
  params: CheckoutSessionParams,
  providerName?: PaymentProvider,
): Promise<CheckoutSessionResult> {
  const resolved = await resolveEnabledProvider(tenantId, providerName);
  await assertCheckoutVelocity(tenantId, params.metadata?.customerEmail ?? params.metadata?.userId);
  // Legal gate: when the caller ties this checkout to an order (metadata.orderRef),
  // every tenant-required agreement (e.g. distance-selling, pre-information) must
  // already be accepted for that order + subject. No orderRef, or a tenant with no
  // required agreements → no-op, so existing callers are unaffected.
  if (params.metadata?.orderRef) {
    await AgreementService.assertCheckoutAgreementsAccepted(tenantId, params.metadata.orderRef, {
      userId: params.metadata.userId,
      anonymousId: params.metadata.anonymousId,
    });
  }
  const result = await getProvider(resolved).createCheckoutSession(tenantId, params);
  // Card-data-touching event audit trail.
  AuditLogService.log({
    tenantId, actorType: 'SYSTEM', action: 'payment.checkout_session_created',
    resourceType: 'payment', resourceId: null,
    metadata: { provider: resolved, amount: params.amount, currency: params.currency },
  }).catch(() => {});
  return result;
}

export function supportsDirectCardPayment(providerName?: PaymentProvider): boolean {
  return getProvider(providerName).supportsDirectCardPayment;
}

export async function chargeWithCard(
  tenantId: string,
  params: DirectChargeParams,
  providerName?: PaymentProvider,
): Promise<DirectChargeResult> {
  const provider = getProvider(providerName);
  if (!provider.supportsDirectCardPayment) {
    throw new AppError(PAYMENT_MESSAGES.DIRECT_PAYMENT_NOT_SUPPORTED, 422, ErrorCode.VALIDATION_ERROR);
  }
  return provider.createPayment(tenantId, params);
}

export function supports3dsCardPayment(providerName?: PaymentProvider): boolean {
  return getProvider(providerName).supports3dsCardPayment;
}

export async function start3dsCharge(
  tenantId: string,
  params: ThreeDSInitParams,
  providerName?: PaymentProvider,
): Promise<ThreeDSInitResult> {
  const provider = getProvider(providerName);
  if (!provider.supports3dsCardPayment) {
    throw new AppError(PAYMENT_MESSAGES.DIRECT_PAYMENT_NOT_SUPPORTED, 422, ErrorCode.VALIDATION_ERROR);
  }
  return provider.create3dsPayment(tenantId, params);
}

export async function complete3dsCharge(
  tenantId: string,
  params: ThreeDSCompleteParams,
  providerName?: PaymentProvider,
): Promise<DirectChargeResult> {
  return getProvider(providerName).complete3dsPayment(tenantId, params);
}

export async function createPaymentIntent(
  tenantId: string,
  params: PaymentIntentParams,
  providerName?: PaymentProvider,
): Promise<PaymentIntentResult> {
  return getProvider(providerName).createPaymentIntent(tenantId, params);
}

export async function getProviderStatus(data: GetProviderStatusDTO): Promise<any> {
  const { tenantId, token, provider } = data;
  try {
    return await getProvider(provider).getPaymentStatus(tenantId, token);
  } catch (error) {
    Logger.error(`${PAYMENT_MESSAGES.GET_STATUS_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
