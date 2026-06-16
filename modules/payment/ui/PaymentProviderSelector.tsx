'use client';

import { Card } from '@nb/common/ui/Card';
import { RadioGroup } from '@nb/common/ui/RadioGroup';
import { WalletBadges } from './WalletBadges';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStripe, faPaypal } from '@fortawesome/free-brands-svg-icons';
import type { WalletMethod } from '@nb/payment/server/payment.enums';
import type { Provider } from '@nb/tenant_subscription/ui/subscription.helpers';

const PROVIDER_OPTIONS = [
  {
    value: 'STRIPE' as Provider,
    label: 'Stripe',
    icon: <FontAwesomeIcon icon={faStripe} className="h-4 w-4 text-[#635BFF]" />,
    hint: 'Credit / debit card, Apple Pay, Google Pay',
  },
  {
    value: 'PAYPAL' as Provider,
    label: 'PayPal',
    icon: <FontAwesomeIcon icon={faPaypal} className="h-4 w-4 text-[#003087]" />,
    hint: 'PayPal balance or linked bank account',
  },
  {
    value: 'IYZICO' as Provider,
    label: 'iyzico',
    icon: <span className="text-sm font-bold text-[#2EC4B6]">iy</span>,
    hint: 'Turkish credit / debit card',
  },
];

type Props = {
  provider: Provider;
  onProviderChange: (v: Provider) => void;
  iyzicoMode: 'card' | 'wallet';
  onIyzicoModeChange: (v: 'card' | 'wallet') => void;
  stripeMode: 'hosted' | 'express';
  onStripeModeChange: (v: 'hosted' | 'express') => void;
  walletMatrix: Record<string, WalletMethod[]>;
};

export function PaymentProviderSelector({
  provider, onProviderChange,
  iyzicoMode, onIyzicoModeChange,
  stripeMode, onStripeModeChange,
  walletMatrix,
}: Props) {
  return (
    <Card title="Payment Provider">
      <RadioGroup
        name="payment-provider"
        legend="Choose how to pay"
        options={PROVIDER_OPTIONS}
        value={provider}
        onChange={(v) => onProviderChange(v as Provider)}
        variant="card"
        columns={3}
      />

      {provider === 'IYZICO' && (
        <div className="mt-4">
          <RadioGroup
            name="iyzico-mode"
            legend="iyzico payment method"
            options={[
              { value: 'card',   label: 'Card',   hint: 'Pay with your card here (Turkish cards charged in TRY)' },
              { value: 'wallet', label: 'Wallet', hint: 'MasterPass / BKM Express on iyzico (TRY)' },
            ]}
            value={iyzicoMode}
            onChange={(v) => onIyzicoModeChange(v as 'card' | 'wallet')}
            variant="card"
            columns={2}
          />
        </div>
      )}

      {provider === 'STRIPE' && (
        <div className="mt-4">
          <RadioGroup
            name="stripe-mode"
            legend="Stripe payment method"
            options={[
              { value: 'hosted',  label: 'Hosted Checkout', hint: 'Redirect to Stripe (card + wallets)' },
              { value: 'express', label: 'Express wallets',  hint: 'Apple Pay / Google Pay / Click to Pay here' },
            ]}
            value={stripeMode}
            onChange={(v) => onStripeModeChange(v as 'hosted' | 'express')}
            variant="card"
            columns={2}
          />
        </div>
      )}

      {walletMatrix[provider]?.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-text-secondary">Supported methods</p>
          <WalletBadges wallets={walletMatrix[provider]} />
        </div>
      )}

      <p className="mt-3 text-xs text-text-secondary">
        Stripe and PayPal redirect you to the provider. iyzico can charge your card here or open its
        hosted wallet (MasterPass / BKM Express). Turkish cards are charged in TRY. You can switch providers at any time.
      </p>
    </Card>
  );
}
