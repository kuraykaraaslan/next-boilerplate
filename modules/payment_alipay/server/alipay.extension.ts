import type { PaymentGatewayContribution } from '@kuraykaraaslan/payment/server/payment.gateway.types';
import AlipayProvider from './providers/alipay.provider';

const contribution: PaymentGatewayContribution = {
  key: 'alipay',
  create: () => new AlipayProvider(),
};

export default contribution;
