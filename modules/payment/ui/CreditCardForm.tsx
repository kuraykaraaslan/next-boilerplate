'use client';
import { useState } from 'react';
import { Form } from '@nb/common/ui/Form';
import { Input } from '@nb/common/ui/Input';
import { Button } from '@nb/common/ui/Button';
import { CreditCardVisual } from './CreditCardVisual';
import type { CreditCardInput, CardBrand } from '@nb/payment/server/payment.enums';


export function detectBrand(number: string): CardBrand {
  const n = number.replace(/\D/g, '');

  if (!n) return 'UNKNOWN';

  const len = n.length;

  const prefix2 = len >= 2 ? Number(n.slice(0, 2)) : 0;
  const prefix3 = len >= 3 ? Number(n.slice(0, 3)) : 0;
  const prefix4 = len >= 4 ? Number(n.slice(0, 4)) : 0;
  const prefix6 = len >= 6 ? Number(n.slice(0, 6)) : 0;

  // 🇹🇷 TROY
  if (n.startsWith('9792')) return 'TROY';

  // 🇷🇺 MIR
  if (prefix4 >= 2200 && prefix4 <= 2204) return 'MIR';

  // 🇨🇳 UnionPay
  // Not: Discover 622126–622925 ile çakışabildiği için Discover'dan sonra da değerlendirilebilir.
  // Burada geniş network tespiti için 62 prefix'i UnionPay kabul edildi.
  if (n.startsWith('62')) return 'UNIONPAY';

  // 🇯🇵 JCB
  if (prefix4 >= 3528 && prefix4 <= 3589) return 'JCB';

  // VISA
  if (n.startsWith('4')) return 'VISA';

  // MASTERCARD
  if (prefix2 >= 51 && prefix2 <= 55) return 'MASTERCARD';
  if (prefix4 >= 2221 && prefix4 <= 2720) return 'MASTERCARD';

  // AMEX
  if (prefix2 === 34 || prefix2 === 37) return 'AMEX';

  // DISCOVER
  if (n.startsWith('6011') || n.startsWith('65')) return 'DISCOVER';
  if (prefix3 >= 644 && prefix3 <= 649) return 'DISCOVER';
  if (prefix6 >= 622126 && prefix6 <= 622925) return 'DISCOVER';

  return 'UNKNOWN';
}

function formatNumber(raw: string, brand: CardBrand): string {
  const digits = raw.replace(/\D/g, '');
  const maxLen = brand === 'AMEX' ? 15 : 16;
  const trimmed = digits.slice(0, maxLen);
  if (brand === 'AMEX') {
    return trimmed.replace(/(\d{4})(\d{0,6})(\d{0,5})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' ')
    );
  }
  return trimmed.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

type CardFormErrors = {
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
  cardholderName?: string;
};

type CreditCardFormProps = {
  onSubmit: (values: CreditCardInput) => Promise<void> | void;
  onCancel?: () => void;
  error?: string;
  className?: string;
  /** Submit button label. Defaults to "Pay". */
  submitLabel?: string;
  /**
   * Fired (with the cleaned 6–8 digit BIN, or '' when shorter) as the card
   * number changes, so the parent can run a live BIN lookup / price quote.
   */
  onBinChange?: (bin: string) => void;
  /** Rendered between the inputs and the actions — e.g. a live price/quote line. */
  quoteSlot?: React.ReactNode;
};

export function CreditCardForm({ onSubmit, onCancel, error, className, submitLabel = 'Pay', onBinChange, quoteSlot }: CreditCardFormProps) {
  const [cardNumber, setCardNumber]       = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiry, setExpiry]               = useState('');
  const [cvv, setCvv]                     = useState('');
  const [cvvFocused, setCvvFocused]       = useState(false);
  const [errors, setErrors]               = useState<CardFormErrors>({});
  const [loading, setLoading]             = useState(false);

  const brand = detectBrand(cardNumber);
  const maxCvv = brand === 'AMEX' ? 4 : 3;

  function handleCardNumberChange(value: string) {
    const formatted = formatNumber(value, brand);
    setCardNumber(formatted);
    if (onBinChange) {
      const digits = formatted.replace(/\D/g, '');
      onBinChange(digits.length >= 6 ? digits.slice(0, 8) : '');
    }
  }

  function validate(): boolean {
    const next: CardFormErrors = {};
    const digits = cardNumber.replace(/\D/g, '');
    const minLen = brand === 'AMEX' ? 15 : 16;
    if (digits.length < minLen) next.cardNumber = `Card number must be ${minLen} digits.`;

    const [mm, yy] = expiry.split('/');
    const month = parseInt(mm ?? '', 10);
    const year  = parseInt(`20${yy ?? ''}`, 10);
    const now   = new Date();
    if (!mm || !yy || month < 1 || month > 12) {
      next.expiry = 'Enter a valid expiry date (MM/YY).';
    } else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      next.expiry = 'Card has expired.';
    }

    if (cvv.length < maxCvv) next.cvv = `CVV must be ${maxCvv} digits.`;
    if (!cardholderName.trim()) next.cardholderName = 'Cardholder name is required.';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit({
        cardNumber:     cardNumber.replace(/\s/g, ''),
        cardholderName: cardholderName.trim(),
        expiryMonth:    expiry.split('/')[0],
        expiryYear:     expiry.split('/')[1],
        cvv,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      onSubmit={handleSubmit}
      error={error}
      className={className}
      actions={
        <>
          {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>}
          <Button type="submit" loading={loading}>{submitLabel}</Button>
        </>
      }
    >
      <div className="flex justify-center mb-2">
        <CreditCardVisual
          cardNumber={cardNumber}
          cardholderName={cardholderName}
          expiryMonth={expiry.split('/')[0] || 'MM'}
          expiryYear={expiry.split('/')[1] || 'YY'}
          cvv={cvv}
          brand={brand}
          flipped={cvvFocused}
        />
      </div>

      <Input
        id="card-number"
        label="Card Number"
        placeholder="1234 5678 9012 3456"
        value={cardNumber}
        inputMode="numeric"
        autoComplete="cc-number"
        onChange={(e) => handleCardNumberChange(e.target.value)}
        error={errors.cardNumber}
      />

      <Input
        id="cardholder-name"
        label="Cardholder Name"
        placeholder="Name on card"
        value={cardholderName}
        autoComplete="cc-name"
        onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
        error={errors.cardholderName}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="expiry"
          label="Expiry"
          placeholder="MM/YY"
          value={expiry}
          inputMode="numeric"
          autoComplete="cc-exp"
          onChange={(e) => setExpiry(formatExpiry(e.target.value))}
          error={errors.expiry}
        />
        <Input
          id="cvv"
          label="CVV"
          type="password"
          placeholder={'•'.repeat(maxCvv)}
          value={cvv}
          inputMode="numeric"
          autoComplete="cc-csc"
          onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, maxCvv))}
          onFocus={() => setCvvFocused(true)}
          onBlur={() => setCvvFocused(false)}
          error={errors.cvv}
        />
      </div>

      {quoteSlot}
    </Form>
  );
}
