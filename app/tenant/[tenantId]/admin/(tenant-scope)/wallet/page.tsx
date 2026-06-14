'use client';
import { use, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { toast } from '@/modules_next/common/ui/toast.store';
import api from '@/modules_next/common/axios';
import { CurrencySelector } from '@/modules_next/common/ui/CurrencySelector';
import { DEFAULT_CURRENCY } from '@/modules/common';

type WalletAccount = {
  walletAccountId: string;
  ownerType: string;
  ownerId: string | null;
  kind: string;
  currency: string;
  cachedBalance: string;
  status: string;
};

type Member = { userId: string; tenantMemberId: string; user?: { email?: string } };

type Posting = {
  walletPostingId: string;
  transactionId: string;
  amount: string;
  currency: string;
  balanceAfter: string;
  createdAt: string;
};

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function WalletPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [statementAccount, setStatementAccount] = useState<WalletAccount | null>(null);
  const [postings, setPostings] = useState<Posting[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);

  const [issueOpen, setIssueOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [submitting, setSubmitting] = useState(false);

  const memberOptions = useMemo(
    () => members.map((m) => ({ value: m.userId, label: m.user?.email ?? m.userId })),
    [members],
  );

  // userId -> member (email + tenantMemberId) for resolving wallet owners.
  const userMap = useMemo(() => {
    const map: Record<string, { email: string; tenantMemberId: string }> = {};
    for (const m of members) {
      map[m.userId] = { email: m.user?.email ?? m.userId, tenantMemberId: m.tenantMemberId };
    }
    return map;
  }, [members]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [accRes, memRes] = await Promise.all([
        api.get(`/tenant/${tenantId}/api/wallet/accounts?pageSize=100`),
        api.get(`/tenant/${tenantId}/api/members`, { params: { pageSize: 100 } }),
      ]);
      setAccounts(accRes.data.data ?? []);
      setMembers(memRes.data.members ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load wallet accounts.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleIssue() {
    setSubmitting(true);
    try {
      await api.post(`/tenant/${tenantId}/api/wallet/accounts`, { userId, amount, currency });
      toast.success('Credits issued.');
      setIssueOpen(false);
      setUserId('');
      setAmount('');
      fetchData();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to issue credits.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    try {
      const res = await api.post(`/tenant/${tenantId}/api/wallet/verify`, {});
      const ok = res.data?.chain?.ok && res.data?.reconciliation?.ok;
      toast[ok ? 'success' : 'error'](
        ok ? 'Ledger verified: chain intact, balances reconciled.' : 'Ledger verification FAILED — see response.',
      );
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Verification failed.'));
    }
  }

  async function openStatement(account: WalletAccount) {
    setStatementAccount(account);
    setStatementLoading(true);
    setPostings([]);
    try {
      const res = await api.get(
        `/tenant/${tenantId}/api/wallet/accounts/${account.walletAccountId}/statement?pageSize=100`,
      );
      setPostings(res.data.data ?? []);
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to load statement.'));
    } finally {
      setStatementLoading(false);
    }
  }

  const statementOwnerLabel = statementAccount
    ? statementAccount.ownerId
      ? userMap[statementAccount.ownerId]?.email ?? statementAccount.ownerId
      : statementAccount.kind
    : '';

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <PageHeader
        title="Wallet"
        subtitle="Internal credit ledger — accounts, balances and double-entry integrity."
        actions={[
          { label: 'Verify ledger', variant: 'outline', onClick: handleVerify },
          { label: 'Issue credits', variant: 'primary', onClick: () => setIssueOpen(true) },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-overlay text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Kind</th>
              <th className="px-3 py-2 text-left font-medium">Owner</th>
              <th className="px-3 py-2 text-left font-medium">Currency</th>
              <th className="px-3 py-2 text-right font-medium">Balance (minor)</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Statement</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-text-secondary">Loading…</td></tr>
            ) : accounts.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-text-secondary">No wallet accounts yet.</td></tr>
            ) : (
              accounts.map((a) => (
                <tr key={a.walletAccountId} className="border-t border-border">
                  <td className="px-3 py-2 text-text-primary">{a.kind}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {a.kind === 'USER_WALLET' && a.ownerId ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-text-primary">{userMap[a.ownerId]?.email ?? a.ownerId}</span>
                        {userMap[a.ownerId]?.tenantMemberId && (
                          <Link
                            href={`/tenant/${tenantId}/admin/members?member=${userMap[a.ownerId].tenantMemberId}`}
                            title="Open member settings"
                            aria-label="Open member settings"
                            className="text-text-secondary hover:text-primary transition-colors"
                          >
                            <FontAwesomeIcon icon={faUpRightFromSquare} className="w-3 h-3" aria-hidden />
                          </Link>
                        )}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-text-primary">{a.currency}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-primary">{a.cachedBalance}</td>
                  <td className="px-3 py-2 text-text-secondary">{a.status}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openStatement(a)}>View</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue credits">
        <div className="space-y-3">
          <Select
            id="issue-user"
            label="Recipient"
            searchable
            placeholder="Search a member…"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            options={memberOptions}
          />
          <Input
            id="issue-amount"
            label="Amount (minor units)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
          />
          <CurrencySelector id="issue-currency" label="Currency" value={currency} onChange={setCurrency} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleIssue} disabled={submitting || !userId || !amount}>
              {submitting ? 'Issuing…' : 'Issue'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!statementAccount}
        onClose={() => setStatementAccount(null)}
        title={statementAccount ? `Statement — ${statementOwnerLabel} (${statementAccount.currency})` : 'Statement'}
      >
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-overlay text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-right font-medium">Balance after</th>
              </tr>
            </thead>
            <tbody>
              {statementLoading ? (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-text-secondary">Loading…</td></tr>
              ) : postings.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-text-secondary">No movements yet.</td></tr>
              ) : (
                postings.map((p) => {
                  const negative = p.amount.startsWith('-');
                  return (
                    <tr key={p.walletPostingId} className="border-t border-border">
                      <td className="px-3 py-2 text-text-secondary">{new Date(p.createdAt).toLocaleString()}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${negative ? 'text-error' : 'text-success'}`}>
                        {negative ? '' : '+'}{p.amount}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-text-primary">{p.balanceAfter}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
