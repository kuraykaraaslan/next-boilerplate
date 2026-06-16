import type { PaymentGatewayContribution } from '@nb/payment/server/payment.gateway.types';
import PaypalProvider from './providers/paypal.provider';

const contribution: PaymentGatewayContribution = {
  key: 'paypal',
  create: () => new PaypalProvider(),
};

export default contribution;
