// Manual / offline settlement gateway (sandboxed). No online processor: a "checkout"
// records the payment PENDING and hands back the operator-authored instructions (the
// manualPaymentNote setting). An operator later marks it paid. No card, portal, 3DS or
// wallets — those ops are absent, so the facade falls back to the base "not supported".
globalThis.__plugin = {
  providers: {
    'payment:gateway': {
      getPaymentStatus: async () => ({ provider: 'manual', status: 'PENDING', manual: true }),

      createCheckoutSession: async (params, host) => {
        const instructions = (await host.settings.get('manualPaymentNote')) || '';
        return {
          sessionId: 'manual_' + Date.now(),
          checkoutUrl: params.successUrl,
          providerData: {
            manual: true,
            status: 'PENDING',
            instructions: instructions,
            amount: params.amount,
            currency: params.currency,
          },
        };
      },
    },
  },
};
