'use client';
import { use, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { ServerDataTable } from '@/modules_next/common/ui/ServerDataTable';
import { toast } from '@/modules_next/common/ui/toast.store';
import api from '@/modules_next/common/axios';
import { CurrencySelector } from '@/modules_next/common/ui/CurrencySelector';
import { DEFAULT_CURRENCY } from '@/modules/common';
import {
  buildWalletAccountColumns,
  buildWalletPostingColumns,
  type WalletAccountRow,
  type WalletPostingRow,
} from '@/modules_next/wallet/ui/wallet-account-columns';

const PAGE_SIZE = 25;

type Member = { userId: string; tenantMemberId: string; user?: { email?: string } };

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function WalletPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [accounts, setAccounts] = useState<WalletAccountRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [statementAccount, setStatementAccount] = useState<WalletAccountRow | null>(null);
  const [postings, setPostings] = useState<WalletPostingRow[]>([]);
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

  const openStatement = useCallback(async (account: WalletAccountRow) => {
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
  }, [tenantId]);

  const total = accounts.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = accounts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = buildWalletAccountColumns({ tenantId, userMap, onStatement: openStatement });
  const postingColumns = buildWalletPostingColumns();

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

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(a) => a.walletAccountId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No wallet accounts yet."
      />

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
        <ServerDataTable
          columns={postingColumns}
          rows={postings}
          getRowKey={(p) => p.walletPostingId}
          page={1}
          totalPages={1}
          onPageChange={() => {}}
          loading={statementLoading}
          hidePagination
          emptyMessage="No movements yet."
        />
      </Modal>
    </div>
  );
}
