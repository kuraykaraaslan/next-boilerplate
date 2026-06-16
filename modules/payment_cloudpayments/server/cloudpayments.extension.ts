import type { PaymentGatewayContribution } from '@nb/payment/server/payment.gateway.types';
import CloudPaymentsProvider from './providers/cloudpayments.provider';

const contribution: PaymentGatewayContribution = {
  key: 'cloudpayments',
  create: () => new CloudPaymentsProvider(),
};

export default contribution;
