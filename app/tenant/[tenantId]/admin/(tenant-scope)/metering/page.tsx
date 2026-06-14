'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { toast } from '@/modules_next/common/ui/toast.store';
import api from '@/modules_next/common/axios';
import { CurrencySelector } from '@/modules_next/common/ui/CurrencySelector';
import { DEFAULT_CURRENCY } from '@/modules/common';

type Meter = {
  meterId: string;
  key: string;
  name: string;
  unit: string;
  aggregation: string;
  unitPriceMinor: string;
  currency: string;
  includedQuantity: string;
  active: boolean;
};

type UsageReading = {
  meterKey: string;
  name: string;
  unit: string;
  aggregation: string;
  periodKey: string;
  usedQuantity: string;
  includedQuantity: string;
  source: 'redis' | 'db';
};

type BillingRun = {
  billingRunId: string;
  subjectType: string;
  subjectId: string | null;
  periodKey: string;
  status: string;
  currency: string;
  totalMinor: string;
  walletDebitedMinor: string;
  invoicedMinor: string;
  invoiceId: string | null;
  createdAt: string;
};

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

const AGGREGATION_OPTIONS = [
  { value: 'SUM', label: 'Sum' },
  { value: 'MAX', label: 'Max' },
  { value: 'LAST', label: 'Last' },
];

export default function MeteringPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [meters, setMeters] = useState<Meter[]>([]);
  const [usage, setUsage] = useState<UsageReading[]>([]);
  const [runs, setRuns] = useState<BillingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [aggregation, setAggregation] = useState('SUM');
  const [unitPriceMinor, setUnitPriceMinor] = useState('');
  const [includedQuantity, setIncludedQuantity] = useState('0');
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [metersRes, usageRes, runsRes] = await Promise.all([
        api.get(`/tenant/${tenantId}/api/metering/meters?pageSize=100`),
        api.get(`/tenant/${tenantId}/api/metering/usage`),
        api.get(`/tenant/${tenantId}/api/metering/billing?pageSize=20`),
      ]);
      setMeters(metersRes.data.data ?? []);
      setUsage(usageRes.data.data ?? []);
      setRuns(runsRes.data.data ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load metering data.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreate() {
    setSubmitting(true);
    try {
      await api.post(`/tenant/${tenantId}/api/metering/meters`, {
        key,
        name,
        unit,
        aggregation,
        unitPriceMinor: unitPriceMinor || '0',
        includedQuantity: includedQuantity || '0',
        currency,
      });
      toast.success('Meter created.');
      setCreateOpen(false);
      setKey('');
      setName('');
      setUnit('');
      setUnitPriceMinor('');
      setIncludedQuantity('0');
      fetchData();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to create meter.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(meter: Meter) {
    try {
      await api.patch(`/tenant/${tenantId}/api/metering/meters/${meter.meterId}`, {
        active: !meter.active,
      });
      fetchData();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to update meter.'));
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <PageHeader
        title="Metering"
        subtitle="Usage meters, current-period totals and metered / overage billing runs."
        actions={[{ label: 'New meter', variant: 'primary', onClick: () => setCreateOpen(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      {/* ── Meters ─────────────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Meters</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-overlay text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Key</th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Unit</th>
                <th className="px-3 py-2 text-left font-medium">Aggregation</th>
                <th className="px-3 py-2 text-right font-medium">Unit price (minor)</th>
                <th className="px-3 py-2 text-right font-medium">Included</th>
                <th className="px-3 py-2 text-left font-medium">Currency</th>
                <th className="px-3 py-2 text-right font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-text-secondary">Loading…</td></tr>
              ) : meters.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-text-secondary">No meters yet.</td></tr>
              ) : (
                meters.map((m) => (
                  <tr key={m.meterId} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-text-primary">{m.key}</td>
                    <td className="px-3 py-2 text-text-primary">{m.name}</td>
                    <td className="px-3 py-2 text-text-secondary">{m.unit}</td>
                    <td className="px-3 py-2 text-text-secondary">{m.aggregation}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-primary">{m.unitPriceMinor}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{m.includedQuantity}</td>
                    <td className="px-3 py-2 text-text-primary">{m.currency}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(m)}>
                        {m.active ? 'Active' : 'Inactive'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Current usage ──────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Current period usage</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-overlay text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Meter</th>
                <th className="px-3 py-2 text-left font-medium">Period</th>
                <th className="px-3 py-2 text-right font-medium">Used</th>
                <th className="px-3 py-2 text-right font-medium">Included</th>
                <th className="px-3 py-2 text-left font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-text-secondary">Loading…</td></tr>
              ) : usage.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-text-secondary">No usage yet.</td></tr>
              ) : (
                usage.map((u) => (
                  <tr key={u.meterKey} className="border-t border-border">
                    <td className="px-3 py-2 text-text-primary">{u.name} <span className="text-text-secondary font-mono">({u.meterKey})</span></td>
                    <td className="px-3 py-2 text-text-secondary">{u.periodKey}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-primary">{u.usedQuantity} {u.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{u.includedQuantity}</td>
                    <td className="px-3 py-2 text-text-secondary">{u.source}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Billing runs ───────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Recent billing runs</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-overlay text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Period</th>
                <th className="px-3 py-2 text-left font-medium">Subject</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Wallet</th>
                <th className="px-3 py-2 text-right font-medium">Invoiced</th>
                <th className="px-3 py-2 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-text-secondary">Loading…</td></tr>
              ) : runs.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-text-secondary">No billing runs yet.</td></tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.billingRunId} className="border-t border-border">
                    <td className="px-3 py-2 text-text-primary">{r.periodKey}</td>
                    <td className="px-3 py-2 text-text-secondary">{r.subjectType}{r.subjectId ? `: ${r.subjectId.slice(0, 8)}…` : ''}</td>
                    <td className="px-3 py-2 text-text-secondary">{r.status}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-primary">{r.totalMinor} {r.currency}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{r.walletDebitedMinor}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{r.invoicedMinor}</td>
                    <td className="px-3 py-2 text-text-secondary">{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New meter">
        <div className="space-y-3">
          <Input id="meter-key" label="Key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="api_calls" />
          <Input id="meter-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="API Calls" />
          <Input id="meter-unit" label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="request" />
          <Select
            id="meter-aggregation"
            label="Aggregation"
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value)}
            options={AGGREGATION_OPTIONS}
          />
          <Input
            id="meter-price"
            label="Unit price (minor units)"
            type="number"
            value={unitPriceMinor}
            onChange={(e) => setUnitPriceMinor(e.target.value)}
            placeholder="1"
          />
          <Input
            id="meter-included"
            label="Included quantity (free allowance)"
            type="number"
            value={includedQuantity}
            onChange={(e) => setIncludedQuantity(e.target.value)}
            placeholder="0"
          />
          <CurrencySelector id="meter-currency" label="Currency" value={currency} onChange={setCurrency} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={submitting || !key || !name || !unit}>
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
