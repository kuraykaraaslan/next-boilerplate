'use client';
import { Badge } from '@nb/common/ui/badge.component';
import type { WalletMethod } from '@nb/payment/server/payment.enums';

const WALLET_LABEL: Record<WalletMethod, string> = {
  CARD: 'Card',
  MASTERPASS: 'MasterPass',
  BKM_EXPRESS: 'BKM Express',
  CLICK_TO_PAY: 'Click to Pay',
  APPLE_PAY: 'Apple Pay',
  GOOGLE_PAY: 'Google Pay',
  LINK: 'Link',
  PAYPAL: 'PayPal',
  AMAZON_PAY: 'Amazon Pay',
  CASH_APP_PAY: 'Cash App',
  SAVED_CARD: 'Saved card',
  INSTALLMENT: 'Installments',
  ALIPAY: 'Alipay',
  WECHAT_PAY: 'WeChat Pay',
  YOOMONEY: 'YooMoney',
  SBP: 'SBP',
  IDEAL: 'iDEAL',
  KLARNA: 'Klarna',
};

/**
 * Small chips listing the wallets / alternative payment methods a provider can
 * surface (MasterPass, BKM Express, Apple/Google Pay, Click to Pay, …). Purely
 * informational — driven by the server wallet matrix.
 */
export function WalletBadges({ wallets, className }: { wallets: WalletMethod[]; className?: string }) {
  if (!wallets || wallets.length === 0) return null;
  return (
    <div className={className ?? 'flex flex-wrap gap-1.5'}>
      {wallets.map((w) => (
        <Badge key={w} variant="neutral" size="sm">
          {WALLET_LABEL[w] ?? w}
        </Badge>
      ))}
    </div>
  );
}
