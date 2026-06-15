'use client';

import Link from 'next/link';
import { Button } from '@/modules_next/common/ui/Button';
import { Badge } from '@/modules_next/common/ui/Badge';
import type { TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';

export type WalletAccountRow = {
  walletAccountId: string;
  ownerType: string;
  ownerId: string | null;
  kind: string;
  currency: string;
  cachedBalance: string;
  status: string;
};

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE: 'success',
  FROZEN: 'warning',
  CLOSED: 'neutral',
};

type Handlers = {
  tenantId: string;
  userMap: Record<string, { email: string; tenantMemberId: string }>;
  onStatement: (account: WalletAccountRow) => void;
};

export function buildWalletAccountColumns(h: Handlers): TableColumn<WalletAccountRow>[] {
  return [
    {
      key: 'kind',
      header: 'Kind',
      render: (a) => <span className="text-text-primary">{a.kind}</span>,
    },
    {
      key: 'ownerId',
      header: 'Owner',
      render: (a) =>
        a.kind === 'USER_WALLET' && a.ownerId ? (
          <span className="inline-flex items-center gap-2">
            <span className="text-text-primary">{h.userMap[a.ownerId]?.email ?? a.ownerId}</span>
            {h.userMap[a.ownerId]?.tenantMemberId && (
              <Link
                href={`/tenant/${h.tenantId}/admin/members?member=${h.userMap[a.ownerId].tenantMemberId}`}
                title="Open member settings"
                aria-label="Open member settings"
                className="text-text-secondary hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <FontAwesomeIcon icon={faUpRightFromSquare} className="w-3 h-3" aria-hidden />
              </Link>
            )}
          </span>
        ) : (
          <span className="text-text-secondary">—</span>
        ),
    },
    {
      key: 'currency',
      header: 'Currency',
      render: (a) => <span className="text-text-primary">{a.currency}</span>,
    },
    {
      key: 'cachedBalance',
      header: 'Balance (minor)',
      align: 'right',
      render: (a) => <span className="tabular-nums text-text-primary">{a.cachedBalance}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <Badge variant={statusVariant[a.status] ?? 'neutral'} dot>{a.status}</Badge>,
    },
    {
      key: '_statement',
      header: '',
      align: 'right',
      render: (a) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => h.onStatement(a)}>View</Button>
        </div>
      ),
    },
  ];
}

export type WalletPostingRow = {
  walletPostingId: string;
  transactionId: string;
  amount: string;
  currency: string;
  balanceAfter: string;
  createdAt: string;
};

export function buildWalletPostingColumns(): TableColumn<WalletPostingRow>[] {
  return [
    {
      key: 'createdAt',
      header: 'Date',
      render: (p) => <span className="text-text-secondary">{new Date(p.createdAt).toLocaleString()}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (p) => {
        const negative = p.amount.startsWith('-');
        return (
          <span className={`tabular-nums ${negative ? 'text-error' : 'text-success'}`}>
            {negative ? '' : '+'}{p.amount}
          </span>
        );
      },
    },
    {
      key: 'balanceAfter',
      header: 'Balance after',
      align: 'right',
      render: (p) => <span className="tabular-nums text-text-primary">{p.balanceAfter}</span>,
    },
  ];
}
