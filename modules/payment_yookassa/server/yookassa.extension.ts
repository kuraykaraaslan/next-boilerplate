import type { PaymentGatewayContribution } from '@kuraykaraaslan/payment/server/payment.gateway.types';
import YooKassaProvider from './providers/yookassa.provider';

const contribution: PaymentGatewayContribution = {
  key: 'yookassa',
  create: () => new YooKassaProvider(),
};

export default contribution;
