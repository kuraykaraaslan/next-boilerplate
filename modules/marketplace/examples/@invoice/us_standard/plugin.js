// US Standard (Stripe Tax) invoicing adapter — sandboxed. Ported from the built-in
// invoice_us_standard adapter. There is no US federal e-invoicing mandate, so
// document "submission" is a no-op: sales tax is computed by the tenant's own
// payment_tax engine at invoice-creation time, not by an external authority.
//
// When the tenant turns on the `stripeTaxEnabled` setting, this adapter creates a
// real Stripe Tax calculation (POST /v1/tax/calculations) and captures its id for
// audit — the externalId/raw the original built-in returned (it only ever
// *mocked* the calc id; here the call is real). The Stripe secret key is injected
// host-side via {{secret:stripeSecretKey}} and never enters the isolate; egress is
// fixed to api.stripe.com.

const API = 'https://api.stripe.com/v1';

// Form-encode helper + Bearer auth header — mirrors the @pay/stripe plugin idiom.
function form(o) {
  return Object.entries(o)
    .filter(([, v]) => v != null)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
    .join('&');
}
const SECRET_AUTH = {
  authorization: 'Bearer {{secret:stripeSecretKey}}',
  'content-type': 'application/x-www-form-urlencoded',
  accept: 'application/json',
};

// Stripe Tax works in the smallest currency unit (cents).
function toMinor(n) { return Math.round((Number(n) || 0) * 100); }

// Resolve the customer address from the (jsonb) invoice.customerAddress, tolerating
// the various shapes the host may serialise.
function readAddress(addr) {
  const a = addr || {};
  return {
    line1: String(a.line1 || a.addressLine1 || a.street || a.line || ''),
    city: String(a.city || a.town || ''),
    postal_code: String(a.postalCode || a.postal_code || a.zip || ''),
    state: String(a.state || a.region || a.province || ''),
  };
}

// Build the form body for tax/calculations from our invoice + lines.
function buildTaxCalculationBody(invoice, lines) {
  const currency = String(invoice.currency || 'USD').toLowerCase();
  const country = String(invoice.customerCountryCode || 'US').toUpperCase();
  const addr = readAddress(invoice.customerAddress);

  const body = {
    currency: currency,
    'customer_details[address][country]': country,
    'customer_details[address_source]': 'shipping',
  };
  if (addr.line1) body['customer_details[address][line1]'] = addr.line1;
  if (addr.city) body['customer_details[address][city]'] = addr.city;
  if (addr.postal_code) body['customer_details[address][postal_code]'] = addr.postal_code;
  if (addr.state) body['customer_details[address][state]'] = addr.state;

  const rows = Array.isArray(lines) && lines.length > 0
    ? lines
    : [{ description: invoice.invoiceNumber, quantity: 1, unitPrice: invoice.subtotal }];

  rows.forEach((l, i) => {
    const amount = toMinor((l.unitPrice || 0) * (l.quantity || 0)) || toMinor(l.unitPrice);
    body['line_items[' + i + '][amount]'] = amount;
    body['line_items[' + i + '][reference]'] = String(l.description || ('line-' + (i + 1))).slice(0, 200);
  });

  return body;
}

globalThis.__plugin = {
  providers: {
    'invoice:adapter': {
      // Always "configured" — a generic PDF receipt can always be issued; whether
      // Stripe Tax is on only affects the optional tax calculation, not document
      // validity. (Matches the original isConfigured() === true.)
      isConfigured: async () => true,

      submit: async ({ invoice, lines }, host) => {
        const stripeTaxEnabled = (await host.settings.get('stripeTaxEnabled')) === 'true';

        // Stripe Tax disabled → no external submission (tax handled by payment_tax).
        if (!stripeTaxEnabled) {
          return { status: 'noop' };
        }

        const res = await host.http.fetch(API + '/tax/calculations', {
          method: 'POST',
          headers: SECRET_AUTH,
          body: form(buildTaxCalculationBody(invoice, lines)),
        });
        if (res.status >= 400) {
          throw new Error('stripe tax ' + res.status + ': ' + String(res.body).slice(0, 300));
        }
        const d = JSON.parse(res.body);
        return {
          externalId: d.id, // Stripe tax calculation id (txcalc_…)
          status: 'accepted',
          raw: { provider: 'stripe-tax', calculation: d.id, taxAmountExclusive: d.tax_amount_exclusive },
        };
      },

      // No external submission to undo — local void on the host side is enough.
      cancel: async () => null,
    },
  },
};
