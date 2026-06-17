import type { PaymentGatewayContribution } from '@kuraykaraaslan/payment/server/payment.gateway.types';
import ManualProvider from './providers/manual.provider';

/**
 * Manual (cash / wire) contribution for the `payment:gateway` extension point.
 * The host discovers this via the extension registry and never imports
 * ManualProvider directly.
 */
const contribution: PaymentGatewayContribution = {
  key: 'manual',
  create: () => new ManualProvider(),
};

export default contribution;
