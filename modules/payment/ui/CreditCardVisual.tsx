'use client';
import { cn } from '@nb/common/server/utils/cn';
import type { CardBrand } from '@nb/payment/server/payment.enums';

const BRAND_STYLE: Record<CardBrand, { label: string; gradient: string }> = {
  VISA: {
    label: 'VISA',
    gradient: 'from-[#1A1F71] to-[#0A0F3D]',
  },
  MASTERCARD: {
    label: 'Mastercard',
    gradient: 'from-[#EB001B] via-[#F79E1B] to-[#FF5F00]',
  },
  AMEX: {
    label: 'AMEX',
    gradient: 'from-[#2E77BC] to-[#006FCF]',
  },
  DISCOVER: {
    label: 'Discover',
    gradient: 'from-[#F58220] to-[#111827]',
  },
  TROY: {
    label: 'TROY',
    gradient: 'from-[#00AEEF] via-[#003B71] to-[#111827]',
  },
  MIR: {
    label: 'MIR',
    gradient: 'from-[#00A551] via-[#0072BC] to-[#111827]',
  },
  UNIONPAY: {
    label: 'UnionPay',
    gradient: 'from-[#E21836] via-[#00447C] to-[#007A3D]',
  },
  JCB: {
    label: 'JCB',
    gradient: 'from-[#0B5CAD] via-[#D71920] to-[#009A44]',
  },
  UNKNOWN: {
    label: '',
    gradient: 'from-[#4B5563] to-[#111827]',
  },
};

function maskNumber(raw: string, brand: CardBrand): string {
  const d = raw.replace(/\D/g, '').padEnd(brand === 'AMEX' ? 15 : 16, '•');
  if (brand === 'AMEX') return `${d.slice(0, 4)} ${d.slice(4, 10)} ${d.slice(10, 15)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8, 12)} ${d.slice(12, 16)}`;
}

type CreditCardVisualProps = {
  cardNumber?: string;
  cardholderName?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
  brand?: CardBrand;
  flipped?: boolean;
  className?: string;
};

export function CreditCardVisual({
  cardNumber = '',
  cardholderName = '',
  expiryMonth = 'MM',
  expiryYear = 'YY',
  cvv = '',
  brand = 'UNKNOWN',
  flipped = false,
  className,
}: CreditCardVisualProps) {
  const { label, gradient } = BRAND_STYLE[brand];

  return (
    <div
      className={cn('w-72 h-44 select-none', className)}
      style={{ perspective: '1000px' }}
      aria-hidden="true"
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Front */}
        <div
          className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br p-5 flex flex-col justify-between shadow-xl text-white', gradient)}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex justify-between items-start">
            <div className="flex gap-1">
              <div className="w-8 h-6 rounded bg-yellow-400/80" />
              <div className="w-8 h-6 rounded bg-yellow-300/50 -ml-3" />
            </div>
            {label && <span className="text-sm font-bold tracking-widest opacity-90">{label}</span>}
          </div>
          <p className="font-mono text-lg tracking-widest">{maskNumber(cardNumber, brand)}</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[9px] uppercase opacity-60 mb-0.5">Card Holder</p>
              <p className="text-xs font-medium tracking-wide uppercase truncate max-w-[10rem]">
                {cardholderName || '••••• •••••'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase opacity-60 mb-0.5">Expires</p>
              <p className="text-xs font-medium font-mono">{expiryMonth}/{expiryYear}</p>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br shadow-xl overflow-hidden text-white', gradient)}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="mt-7 h-10 bg-black/60 w-full" />
          <div className="px-5 mt-4 flex items-center justify-end gap-3">
            <div className="flex-1 h-6 bg-white/20 rounded" />
            <div className="bg-white/90 rounded px-3 py-1 text-right min-w-[3.5rem]">
              <p className="text-[9px] text-gray-500 mb-0.5">CVV</p>
              <p className="font-mono text-sm text-gray-800 tracking-widest">
                {cvv ? '•'.repeat(cvv.length) : '•••'}
              </p>
            </div>
          </div>
          {label && (
            <p className="absolute bottom-4 right-5 text-sm font-bold tracking-widest opacity-80">{label}</p>
          )}
        </div>
      </div>
    </div>
  );
}
