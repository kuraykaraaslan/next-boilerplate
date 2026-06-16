import type { CheckoutSessionParams, DirectChargeParams } from '@nb/payment/server/providers/base.provider'

/**
 * Build the hosted CheckoutForm initialize body. MasterPass / BKM Express still
 * appear when enabled in the iyzico merchant panel — no code needed.
 */
export function buildCheckoutBody(
  tenantId: string,
  params: CheckoutSessionParams,
  conversationId: string,
  enabledInstallments: number[],
) {
  return {
    locale: 'tr',
    conversationId,
    price: params.amount.toFixed(2),
    paidPrice: params.amount.toFixed(2),
    currency: params.currency.toUpperCase() === 'TRY' ? 'TRY' : 'USD',
    basketId: conversationId,
    paymentGroup: 'SUBSCRIPTION',
    ...(enabledInstallments.length ? { enabledInstallments } : {}),
    callbackUrl: params.successUrl,
    buyer: {
      id: params.metadata?.tenantId || tenantId,
      name: 'Tenant',
      surname: 'Admin',
      email: params.metadata?.email || 'buyer@example.com',
      identityNumber: '00000000000',
      registrationAddress: 'N/A',
      city: 'Istanbul',
      country: 'Turkey',
      ip: '127.0.0.1',
    },
    shippingAddress: {
      contactName: 'Tenant Admin',
      city: 'Istanbul',
      country: 'Turkey',
      address: 'N/A',
    },
    billingAddress: {
      contactName: 'Tenant Admin',
      city: 'Istanbul',
      country: 'Turkey',
      address: 'N/A',
    },
    basketItems: [{
      id: params.metadata?.planId || 'PLAN',
      name: params.description,
      category1: 'Subscription',
      itemType: 'VIRTUAL',
      price: params.amount.toFixed(2),
    }],
  }
}

/**
 * Shared `/payment/auth` + `/payment/3dsecure/initialize` request body. iyzico
 * requires `price` to equal the sum of basket-item prices, so we send a single
 * basket item equal to `amount`. Card data is never persisted/logged.
 */
export function buildChargeBody(tenantId: string, params: DirectChargeParams, conversationId: string) {
  const expireYear = params.card.expireYear.length === 2
    ? `20${params.card.expireYear}`
    : params.card.expireYear

  const name = params.buyer?.name || 'Tenant'
  const surname = params.buyer?.surname || 'Admin'
  const contactName = `${name} ${surname}`.trim()
  const basketItems = (params.basketItems && params.basketItems.length > 0
    ? params.basketItems
    : [{ id: 'ITEM', name: params.description, price: params.amount }]
  ).map((b) => ({
    id: b.id,
    name: b.name,
    category1: 'Subscription',
    itemType: 'VIRTUAL',
    price: b.price.toFixed(2),
  }))

  return {
    locale: 'tr',
    conversationId,
    price: params.amount.toFixed(2),
    paidPrice: params.amount.toFixed(2),
    currency: params.currency.toUpperCase(),
    installment: 1,
    basketId: conversationId,
    paymentChannel: 'WEB',
    paymentGroup: 'SUBSCRIPTION',
    paymentCard: {
      cardHolderName: params.card.cardHolderName,
      cardNumber: params.card.cardNumber,
      expireMonth: params.card.expireMonth,
      expireYear,
      cvc: params.card.cvc,
      registerCard: 0,
    },
    buyer: {
      id: params.buyer?.id || tenantId,
      name,
      surname,
      email: params.buyer?.email || 'buyer@example.com',
      identityNumber: params.buyer?.identityNumber || '11111111111',
      registrationAddress: 'N/A',
      city: 'Istanbul',
      country: 'Turkey',
      ip: params.buyer?.ip || '127.0.0.1',
    },
    shippingAddress: { contactName, city: 'Istanbul', country: 'Turkey', address: 'N/A' },
    billingAddress: { contactName, city: 'Istanbul', country: 'Turkey', address: 'N/A' },
    basketItems,
  }
}
