'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@nb/common/server/axios';
import { Card } from '@nb/common/ui/Card';
import { Input } from '@nb/common/ui/Input';
import { Select } from '@nb/common/ui/Select';
import { Button } from '@nb/common/ui/Button';
import { Spinner } from '@nb/common/ui/Spinner';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { Badge } from '@nb/common/ui/Badge';
import { toast } from '@nb/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';

type SpecType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTISELECT' | 'DATE' | 'COLOR';

type CategorySpec = {
  specId: string;
  key: string;
  label: string;
  type: SpecType;
  unit?: string | null;
  placeholder?: string | null;
  options?: string[] | null;
  isRequired: boolean;
  isFilterable: boolean;
  sortOrder: number;
};

type SpecValue = {
  specValueId: string;
  specId: string;
  value: string;
};

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

function parseMultiselect(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
}

export function ProductSpecValuesPanel({
  tenantId,
  productId,
  categoryId,
}: {
  tenantId: string;
  productId: string;
  categoryId: string;
}) {
  const [specs, setSpecs] = useState<CategorySpec[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get(`/tenant/${tenantId}/api/store/categories/${categoryId}?withSpecs=true`),
        api.get(`/tenant/${tenantId}/api/store/products/${productId}?detail=true`),
      ]);
      const loadedSpecs: CategorySpec[] = (catRes.data.category?.specs ?? []) as CategorySpec[];
      loadedSpecs.sort((a, b) => a.sortOrder - b.sortOrder);
      setSpecs(loadedSpecs);

      const loadedValues: SpecValue[] = (prodRes.data.product?.specValues ?? []) as SpecValue[];
      const map: Record<string, string> = {};
      for (const v of loadedValues) map[v.specId] = v.value;
      setValues(map);
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load category specs.'));
    } finally { setLoading(false); }
  }, [tenantId, productId, categoryId]);

  useEffect(() => { load(); }, [load]);

  const setOne = useCallback((specId: string, value: string) => {
    setValues((v) => ({ ...v, [specId]: value }));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        values: specs
          .map((s) => ({ specId: s.specId, value: values[s.specId] ?? '' }))
          .filter((v) => v.value !== ''),
      };
      await api.put(`/tenant/${tenantId}/api/store/products/${productId}/spec-values`, payload);
      toast.success('Specs saved');
      load();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to save specs.'));
    } finally { setSaving(false); }
  }

  const dirty = useMemo(() => true, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;

  if (specs.length === 0) {
    return (
      <Card>
        <div className="p-6 text-sm text-text-secondary">
          This product&apos;s category has no spec template yet. Define specs on the category to fill them in here.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Fill the spec values defined by this product&apos;s category template.
        </p>
        <Button variant="primary" size="sm" onClick={handleSave} loading={saving} disabled={!dirty}>
          <FontAwesomeIcon icon={faSave} /> Save Specs
        </Button>
      </div>

      <Card>
        <div className="p-6 space-y-4">
          {specs.map((spec) => {
            const current = values[spec.specId] ?? '';
            const inputId = `spec-${spec.specId}`;
            const labelWithUnit = spec.unit ? `${spec.label} (${spec.unit})` : spec.label;
            const badges = (
              <div className="flex gap-1 ml-2">
                {spec.isRequired && <Badge size="sm" variant="warning">Required</Badge>}
                {spec.isFilterable && <Badge size="sm" variant="info">Filterable</Badge>}
              </div>
            );

            if (spec.type === 'TEXT' || spec.type === 'NUMBER') {
              return (
                <div key={spec.specId}>
                  <Input
                    id={inputId}
                    label={labelWithUnit}
                    type={spec.type === 'NUMBER' ? 'number' : 'text'}
                    value={current}
                    placeholder={spec.placeholder ?? undefined}
                    onChange={(e) => setOne(spec.specId, e.target.value)}
                  />
                  {(spec.isRequired || spec.isFilterable) && (
                    <div className="mt-1">{badges}</div>
                  )}
                </div>
              );
            }

            if (spec.type === 'DATE') {
              return (
                <div key={spec.specId}>
                  <Input
                    id={inputId}
                    label={labelWithUnit}
                    type="date"
                    value={current}
                    onChange={(e) => setOne(spec.specId, e.target.value)}
                  />
                </div>
              );
            }

            if (spec.type === 'COLOR') {
              return (
                <div key={spec.specId} className="space-y-1">
                  <label htmlFor={inputId} className="text-sm font-medium text-text-primary block">
                    {labelWithUnit}
                  </label>
                  <input
                    id={inputId}
                    type="color"
                    value={current || '#000000'}
                    onChange={(e) => setOne(spec.specId, e.target.value)}
                    className="h-9 w-16 rounded border border-border bg-surface-base cursor-pointer"
                  />
                </div>
              );
            }

            if (spec.type === 'BOOLEAN') {
              return (
                <div key={spec.specId}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={current === 'true'}
                      onChange={(e) => setOne(spec.specId, e.target.checked ? 'true' : 'false')}
                    />
                    <span className="font-medium text-text-primary">{labelWithUnit}</span>
                  </label>
                </div>
              );
            }

            if (spec.type === 'SELECT') {
              const opts = (spec.options ?? []).map((o) => ({ value: o, label: o }));
              return (
                <div key={spec.specId}>
                  <Select
                    id={inputId}
                    label={labelWithUnit}
                    options={[{ value: '', label: spec.placeholder ?? '— Select —' }, ...opts]}
                    value={current}
                    onChange={(e) => setOne(spec.specId, e.target.value)}
                  />
                </div>
              );
            }

            if (spec.type === 'MULTISELECT') {
              const selected = parseMultiselect(current);
              const toggle = (opt: string) => {
                const next = selected.includes(opt)
                  ? selected.filter((s) => s !== opt)
                  : [...selected, opt];
                setOne(spec.specId, JSON.stringify(next));
              };
              return (
                <div key={spec.specId} className="space-y-1">
                  <label className="text-sm font-medium text-text-primary block">
                    {labelWithUnit}
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {(spec.options ?? []).map((opt) => (
                      <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.includes(opt)}
                          onChange={() => toggle(opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </Card>
    </div>
  );
}
