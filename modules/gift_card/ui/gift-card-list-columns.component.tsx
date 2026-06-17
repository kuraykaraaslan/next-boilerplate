'use client';

import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import type { TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGift, faBan, faSlidersH } from '@fortawesome/free-solid-svg-icons';
import type { GiftCardStatus } from '@kuraykaraaslan/gift_card/server/gift_card.enums';
import type { GiftCard as CanonicalGiftCard } from '@kuraykaraaslan/gift_card/server/gift_card.types';

export type GiftCardRow = Pick<
  CanonicalGiftCard,
  'giftCardId' | 'status' | 'initialAmount' | 'remainingAmount' | 'currency'
> & { recipientEmail: string | null; expiresAt: string | null; createdAt: string };

const statusVariant: Record<GiftCardStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE: 'success',
  PARTIALLY_REDEEMED: 'warning',
  REDEEMED: 'neutral',
  EXPIRED: 'error',
  VOID: 'error',
};

function money(minor: number, currency: string): string {
  return `${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency}`;
}

type Handlers = {
  onVoid: (c: GiftCardRow) => void;
  onAdjust: (c: GiftCardRow) => void;
};

export function buildGiftCardColumns(h: Handlers): TableColumn<GiftCardRow>[] {
  return [
    {
      key: 'card',
      header: 'Gift Card',
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
            <FontAwesomeIcon icon={faGift} />
          </span>
          <div className="min-w-0">
            <p className="font-mono font-semibold tracking-wide text-text-primary">
              {money(c.initialAmount, c.currency)}
            </p>
            <p className="text-xs text-text-secondary truncate max-w-xs">
              {c.recipientEmail ?? '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'remainingAmount',
      header: 'Balance',
      render: (c) => (
        <span className="font-semibold tabular-nums text-text-primary">
          {money(c.remainingAmount, c.currency)}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      render: (c) => (
        <span className="text-text-secondary text-sm">
          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <Badge variant={statusVariant[c.status]} dot>{c.status.replace('_', ' ')}</Badge>,
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              { label: 'Adjust balance', icon: <FontAwesomeIcon icon={faSlidersH} />, onClick: () => h.onAdjust(c) },
              {
                label: c.status === 'VOID' ? 'Voided' : 'Void',
                icon: <FontAwesomeIcon icon={faBan} />,
                onClick: () => h.onVoid(c),
                variant: 'danger',
              },
            ]}
          />
        </div>
      ),
    },
  ];
}
