// Stripe gateway (sandboxed). Form-encoded REST over Bearer; the secret key is
// injected host-side via {{secret:stripeSecretKey}} and never enters the isolate.
// Mirrors the built-in StripeProvider: checkout sessions, Express Checkout payment
// intents, customer portal, payment status.
const API = 'https://api.stripe.com/v1';
function form(o) { return Object.entries(o).filter(([, v]) => v != null).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&'); }
const SECRET_AUTH = { authorization: 'Bearer {{secret:stripeSecretKey}}', 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' };

globalThis.__plugin = {
  providers: {
    'payment:gateway': {
      getPaymentStatus: async ({ token }, host) => {
        const res = await host.http.fetch(API + '/payment_intents/' + encodeURIComponent(token), {
          method: 'GET', headers: { authorization: 'Bearer {{secret:stripeSecretKey}}', accept: 'application/json' },
        });
        if (res.status >= 400) throw new Error('stripe status ' + res.status);
        return JSON.parse(res.body).status;
      },

      createCheckoutSession: async (params, host) => {
        const body = {
          mode: 'payment',
          'line_items[0][price_data][currency]': String(params.currency).toLowerCase(),
          'line_items[0][price_data][product_data][name]': params.description,
          'line_items[0][price_data][unit_amount]': Math.round(params.amount * 100),
          'line_items[0][quantity]': 1,
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
        };
        if (params.metadata) for (const [k, v] of Object.entries(params.metadata)) body['metadata[' + k + ']'] = v;
        const res = await host.http.fetch(API + '/checkout/sessions', { method: 'POST', headers: SECRET_AUTH, body: form(body) });
        if (res.status >= 400) throw new Error('stripe checkout ' + res.status + ': ' + String(res.body).slice(0, 150));
        const d = JSON.parse(res.body);
        return { sessionId: d.id, checkoutUrl: d.url, providerData: { sessionId: d.id } };
      },

      createPaymentIntent: async (params, host) => {
        const body = {
          amount: Math.round(params.amount * 100),
          currency: String(params.currency).toLowerCase(),
          description: params.description,
          'automatic_payment_methods[enabled]': 'true',
        };
        if (params.metadata) for (const [k, v] of Object.entries(params.metadata)) body['metadata[' + k + ']'] = v;
        const res = await host.http.fetch(API + '/payment_intents', { method: 'POST', headers: SECRET_AUTH, body: form(body) });
        if (res.status >= 400) throw new Error('stripe intent ' + res.status);
        const d = JSON.parse(res.body);
        const publishableKey = await host.settings.get('stripePublishableKey');
        return { clientSecret: d.client_secret, publishableKey: publishableKey || null, providerRef: d.id };
      },

      createCustomerPortalSession: async (params, host) => {
        let customerId = params.customerExternalId || (await host.settings.get('stripeCustomerId')) || undefined;
        if (!customerId && params.customerEmail) {
          const cr = await host.http.fetch(API + '/customers', { method: 'POST', headers: SECRET_AUTH, body: form({ email: params.customerEmail }) });
          if (cr.status >= 400) return { url: null, note: 'Stripe customer could not be created' };
          customerId = JSON.parse(cr.body).id;
          if (customerId) await host.settings.set('stripeCustomerId', customerId);
        }
        if (!customerId) return { url: null, note: 'No Stripe customer linked yet — make a checkout first' };
        const sr = await host.http.fetch(API + '/billing_portal/sessions', { method: 'POST', headers: SECRET_AUTH, body: form({ customer: customerId, return_url: params.returnUrl }) });
        if (sr.status >= 400) {
          let note = 'Stripe billing portal request failed';
          try { note = JSON.parse(sr.body).error.message || note; } catch (e) { /* keep default */ }
          return { url: null, note: note };
        }
        return { url: JSON.parse(sr.body).url };
      },
    },
  },
};
