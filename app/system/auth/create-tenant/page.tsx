'use client';
import { useState } from 'react';
import api from '@/libs/axios';
import { BrandLogo } from '@/modules_next/common/ui/BrandLogo';
import { Form } from '@/modules_next/common/ui/Form';
import { Input } from '@/modules_next/common/ui/Input';
import { Button } from '@/modules_next/common/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faGlobe } from '@fortawesome/free-solid-svg-icons';

export default function CreateTenantPage() {
  const [values, setValues] = useState({ name: '', slug: '' });
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  function validate(): boolean {
    const next: { name?: string; slug?: string } = {};
    if (!values.name.trim()) next.name = 'Organization name is required.';
    if (!values.slug.trim()) next.slug = 'Slug is required.';
    else if (!/^[a-z0-9-]+$/.test(values.slug)) next.slug = 'Slug may only contain lowercase letters, numbers, and hyphens.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      await api.post('/system/api/tenants/create', values);
      setSuccess(true);
    } catch (err: any) {
      setApiError(err.response?.data?.error ?? err.message ?? 'Failed to create organization.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <BrandLogo><FontAwesomeIcon icon={faBuilding} /></BrandLogo>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Create Organization</h1>
          <p className="text-sm text-text-secondary">Set up your new tenant workspace</p>
        </div>

        {success ? (
          <div className="rounded-lg bg-success-subtle border border-success px-4 py-3 text-center space-y-1">
            <p className="text-sm font-semibold text-success-fg">Organization created!</p>
            <p className="text-sm text-success-fg">Your tenant workspace is ready.</p>
          </div>
        ) : (
          <Form onSubmit={handleSubmit} error={apiError}>
            <Input
              id="tenant-name"
              label="Organization Name"
              required
              placeholder="Acme Corp"
              prefixIcon={<FontAwesomeIcon icon={faBuilding} className="w-3.5 h-3.5" />}
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              error={errors.name}
            />
            <Input
              id="tenant-slug"
              label="Slug"
              required
              placeholder="acme-corp"
              hint="Used in URLs — lowercase letters, numbers, and hyphens only."
              prefixIcon={<FontAwesomeIcon icon={faGlobe} className="w-3.5 h-3.5" />}
              value={values.slug}
              onChange={(e) => setValues((v) => ({ ...v, slug: e.target.value.toLowerCase() }))}
              error={errors.slug}
            />
            <Button type="submit" fullWidth loading={loading}>
              Create Organization
            </Button>
          </Form>
        )}
      </div>

      <p className="text-center text-sm text-text-secondary">
        <a href="/system/auth/select-tenant" className="text-primary font-medium hover:underline">
          Select an existing organization
        </a>
      </p>
    </div>
  );
}
