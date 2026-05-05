import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTag, faPercent, faDollarSign } from '@fortawesome/free-solid-svg-icons';

type CouponBadgeProps = {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  currency?: string | null;
  size?: 'sm' | 'md';
};

export function CouponBadge({
  code,
  discountType,
  discountValue,
  currency,
  size = 'md',
}: CouponBadgeProps) {
  const label =
    discountType === 'PERCENTAGE'
      ? `${discountValue}%`
      : `${discountValue} ${currency ?? ''}`;

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-sm px-3 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border border-primary/30 bg-primary/10 font-mono font-medium text-primary ${sizeClass}`}
    >
      <FontAwesomeIcon
        icon={discountType === 'PERCENTAGE' ? faPercent : faDollarSign}
        className="text-[0.65em]"
      />
      {code}
      <span className="text-primary/60">·</span>
      {label} off
    </span>
  );
}
