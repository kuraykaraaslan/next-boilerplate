import type { PaymentGatewayContribution } from '@nb/payment/server/payment.gateway.types';
import StripeProvider from './providers/stripe.provider';

/**
 * Stripe contribution for the `payment:gateway` extension point. The host
 * (payment.checkout.registry) discovers this via the extension registry and
 * never imports StripeProvider directly.
 */
const contribution: PaymentGatewayContribution = {
  key: 'stripe',
  create: () => new StripeProvider(),
};

export default contribution;
