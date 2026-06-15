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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import {
  buildMeterColumns,
  buildUsageColumns,
  buildBillingRunColumns,
  type MeterRow,
  type UsageRow,
  type BillingRunRow,
} from '@/modules_next/metering/ui/metering-columns';

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

const AGGREGATION_OPTIONS = [
  { value: 'SUM', label: 'Sum' },
  { value: 'MAX', label: 'Max' },
  { value: 'LAST', label: 'Last' },
];

const METERS_PAGE_SIZE = 20;
const RUNS_PAGE_SIZE = 20;

const ACTIVE_OPTIONS = [
  { value: '', label: 'All meters' },
  { value: 'true', label: 'Active only' },
  { value: 'false', label: 'Inactive only' },
];

const RUN_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
];

export default function MeteringPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  // Meters — server-side search (q), active filter and pagination.
  const [meters, setMeters] = useState<MeterRow[]>([]);
  const [metersTotal, setMetersTotal] = useState(0);
  const [metersPage, setMetersPage] = useState(1);
  const [metersQuery, setMetersQuery] = useState('');
  const [metersActive, setMetersActive] = useState('');
  const [metersLoading, setMetersLoading] = useState(true);

  // Current-period usage — not paginated server-side, so filter the snapshot client-side.
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [usageQuery, setUsageQuery] = useState('');
  const [usageLoading, setUsageLoading] = useState(true);

  // Billing runs — server-side status filter and pagination.
  const [runs, setRuns] = useState<BillingRunRow[]>([]);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runsPage, setRunsPage] = useState(1);
  const [runsStatus, setRunsStatus] = useState('');
  const [runsLoading, setRunsLoading] = useState(true);

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

  const fetchMeters = useCallback(async () => {
    setMetersLoading(true);
    try {
      const params: Record<string, string | number> = { page: metersPage - 1, pageSize: METERS_PAGE_SIZE };
      if (metersQuery.trim()) params.q = metersQuery.trim();
      if (metersActive) params.active = metersActive;
      const res = await api.get(`/tenant/${tenantId}/api/metering/meters`, { params });
      setMeters(res.data.data ?? []);
      setMetersTotal(res.data.total ?? 0);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load meters.'));
    } finally {
      setMetersLoading(false);
    }
  }, [tenantId, metersPage, metersQuery, metersActive]);

  const fetchUsage = useCallback(async () => {
    setUsageLoading(true);
    try {
      const res = await api.get(`/tenant/${tenantId}/api/metering/usage`);
      setUsage(res.data.data ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load usage.'));
    } finally {
      setUsageLoading(false);
    }
  }, [tenantId]);

  const fetchRuns = useCallback(async () => {
    setRunsLoading(true);
    try {
      const params: Record<string, string | number> = { page: runsPage - 1, pageSize: RUNS_PAGE_SIZE };
      if (runsStatus) params.status = runsStatus;
      const res = await api.get(`/tenant/${tenantId}/api/metering/billing`, { params });
      setRuns(res.data.data ?? []);
      setRunsTotal(res.data.total ?? 0);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load billing runs.'));
    } finally {
      setRunsLoading(false);
    }
  }, [tenantId, runsPage, runsStatus]);

  function refreshAll() {
    fetchMeters();
    fetchUsage();
    fetchRuns();
  }

  // Debounced meter fetch — re-runs on search / filter / page change.
  useEffect(() => {
    const t = setTimeout(fetchMeters, metersQuery ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchMeters, metersQuery]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);
  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const filteredUsage = useMemo(() => {
    const q = usageQuery.trim().toLowerCase();
    if (!q) return usage;
    return usage.filter((u) => u.name.toLowerCase().includes(q) || u.meterKey.toLowerCase().includes(q));
  }, [usage, usageQuery]);

  const metersTotalPages = Math.max(1, Math.ceil(metersTotal / METERS_PAGE_SIZE));
  const runsTotalPages = Math.max(1, Math.ceil(runsTotal / RUNS_PAGE_SIZE));

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
      refreshAll();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to create meter.'));
    } finally {
      setSubmitting(false);
    }
  }

  const toggleActive = useCallback(async (meter: MeterRow) => {
    try {
      await api.patch(`/tenant/${tenantId}/api/metering/meters/${meter.meterId}`, {
        active: !meter.active,
      });
      fetchMeters();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to update meter.'));
    }
  }, [tenantId, fetchMeters]);

  const meterColumns = buildMeterColumns(toggleActive);
  const usageColumns = buildUsageColumns();
  const runColumns = buildBillingRunColumns();

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <PageHeader
        title="Metering"
        subtitle="Usage meters, current-period totals and metered / overage billing runs."
        actions={[{ label: 'New meter', variant: 'primary', onClick: () => setCreateOpen(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        title="Meters"
        columns={meterColumns}
        rows={meters}
        getRowKey={(m) => m.meterId}
        page={metersPage}
        totalPages={metersTotalPages}
        total={metersTotal}
        pageSize={METERS_PAGE_SIZE}
        onPageChange={setMetersPage}
        loading={metersLoading}
        emptyMessage={metersQuery || metersActive ? 'No meters match your filters.' : 'No meters yet.'}
        toolbar={
          <div className="pb-4 grid grid-cols-1 gap-4 sm:items-end sm:grid-cols-[1fr_auto]">
            <Input
              id="meter-search" label="Search meters" placeholder="Search by key or name…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={metersQuery}
              onChange={(e) => { setMetersQuery(e.target.value); setMetersPage(1); }}
            />
            <Select
              id="meter-active-filter" label="Status" options={ACTIVE_OPTIONS} value={metersActive}
              onChange={(e) => { setMetersActive(e.target.value); setMetersPage(1); }}
            />
          </div>
        }
      />

      <ServerDataTable
        title="Current period usage"
        columns={usageColumns}
        rows={filteredUsage}
        getRowKey={(u) => u.meterKey}
        page={1}
        totalPages={1}
        onPageChange={() => {}}
        loading={usageLoading}
        hidePagination
        emptyMessage={usageQuery ? 'No usage matches your search.' : 'No usage yet.'}
        toolbar={
          <div className="pb-4 sm:max-w-xs">
            <Input
              id="usage-search" label="Search usage" placeholder="Search by meter…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={usageQuery}
              onChange={(e) => setUsageQuery(e.target.value)}
            />
          </div>
        }
      />

      <ServerDataTable
        title="Recent billing runs"
        columns={runColumns}
        rows={runs}
        getRowKey={(r) => r.billingRunId}
        page={runsPage}
        totalPages={runsTotalPages}
        total={runsTotal}
        pageSize={RUNS_PAGE_SIZE}
        onPageChange={setRunsPage}
        loading={runsLoading}
        emptyMessage={runsStatus ? 'No billing runs match your filter.' : 'No billing runs yet.'}
        toolbar={
          <div className="pb-4 sm:max-w-xs">
            <Select
              id="run-status-filter" label="Status" options={RUN_STATUS_OPTIONS} value={runsStatus}
              onChange={(e) => { setRunsStatus(e.target.value); setRunsPage(1); }}
            />
          </div>
        }
      />

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
