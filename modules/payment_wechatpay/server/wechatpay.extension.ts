import type { PaymentGatewayContribution } from '@nb/payment/server/payment.gateway.types';
import WeChatPayProvider from './providers/wechatpay.provider';

const contribution: PaymentGatewayContribution = {
  key: 'wechatpay',
  create: () => new WeChatPayProvider(),
};

export default contribution;
