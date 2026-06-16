import type { PaymentGatewayContribution } from '@nb/payment/server/payment.gateway.types';
import IyzicoProvider from './providers/iyzico.provider';

const contribution: PaymentGatewayContribution = {
  key: 'iyzico',
  create: () => new IyzicoProvider(),
};

export default contribution;
