'use client';
import { useState } from 'react';
import { Input } from '@/modules_next/common/ui/Input';
import { Button } from '@/modules_next/common/ui/Button';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faLink } from '@fortawesome/free-solid-svg-icons';

export interface CreateTenantValues {
  name: string;
  slug: string;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32);
}

export function CreateTenantForm({
  onSubmit,
  error,
  className,
}: {
  onSubmit: (values: CreateTenantValues) => Promise<void> | void;
  error?: string;
  className?: string;
}) {
  const [values, setValues] = useState<CreateTenantValues>({ name: '', slug: '' });
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Partial<CreateTenantValues>>({});
  const [loading, setLoading] = useState(false);

  function handleNameChange(name: string) {
    setValues((v) => ({
      ...v,
      name,
      slug: slugTouched ? v.slug : toSlug(name),
    }));
  }

  function handleSlugChange(slug: string) {
    setSlugTouched(true);
    setValues((v) => ({ ...v, slug: toSlug(slug) }));
  }

  function validate(): boolean {
    const next: Partial<CreateTenantValues> = {};
    if (!values.name.trim()) next.name = 'Organization name is required.';
    if (!values.slug.trim()) next.slug = 'Slug is required.';
    else if (!/^[a-z0-9-]{2,32}$/.test(values.slug)) {
      next.slug = 'Slug must be 2–32 lowercase letters, numbers, or hyphens.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try { await onSubmit(values); } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      <div className="space-y-4">
        {error && <AlertBanner variant="error" message={error} />}

        <Input
          id="tenant-name"
          label="Organization Name"
          required
          prefixIcon={<FontAwesomeIcon icon={faBuilding} className="w-3.5 h-3.5" />}
          value={values.name}
          onChange={(e) => handleNameChange(e.target.value)}
          error={errors.name}
        />

        <Input
          id="tenant-slug"
          label="Identifier (slug)"
          required
          hint="Used in URLs. Only lowercase letters, numbers, and hyphens."
          prefixIcon={<FontAwesomeIcon icon={faLink} className="w-3.5 h-3.5" />}
          value={values.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          error={errors.slug}
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={loading}>Create Organization</Button>
        </div>
      </div>
    </form>
  );
}
