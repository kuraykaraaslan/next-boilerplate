'use client';
import { useState } from 'react';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { AvatarUpload } from '@kuraykaraaslan/common/ui/avatar-upload.component';
import type { UserProfile } from '@kuraykaraaslan/user_profile/server/user_profile.types';

export type UserProfileValues = Pick<UserProfile, 'name' | 'biography' | 'profilePicture'>;

type Errors = Partial<Record<keyof UserProfileValues, string>>;

export function UserProfileForm({
  initial = {},
  onSubmit,
  onCancel,
  error,
  uploadEndpoint = '/system/api/storage',
  className,
}: {
  initial?: Partial<UserProfileValues>;
  onSubmit: (values: UserProfileValues) => Promise<void> | void;
  onCancel?: () => void;
  error?: string;
  uploadEndpoint?: string;
  className?: string;
}) {
  const [values, setValues] = useState<UserProfileValues>({
    name:           initial.name           ?? null,
    biography:      initial.biography      ?? null,
    profilePicture: initial.profilePicture ?? null,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const next: Errors = {};
    if (values.biography && values.biography.length > 300) {
      next.biography = 'Bio must be 300 characters or less.';
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

  function set<K extends keyof UserProfileValues>(key: K, val: UserProfileValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-6">
        {error && <AlertBanner variant="error" message={error} />}

        <div className="flex justify-center">
          <AvatarUpload
            src={values.profilePicture}
            name={values.name || 'User'}
            uploadEndpoint={uploadEndpoint}
            onUpload={(url) => set('profilePicture', url)}
            onRemove={() => set('profilePicture', null)}
          />
        </div>

        <Input
          id="profile-name"
          label="Display Name"
          type="text"
          value={values.name ?? ''}
          onChange={(e) => set('name', e.target.value || null)}
          error={errors.name}
        />

        <div className="space-y-1">
          <label htmlFor="profile-bio" className="block text-sm font-medium text-text-primary">Bio</label>
          <textarea
            id="profile-bio"
            rows={3}
            value={values.biography ?? ''}
            onChange={(e) => set('biography', e.target.value || null)}
            className="block w-full rounded-md border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus transition-colors resize-none"
          />
          {errors.biography && <p className="text-xs text-error" role="alert">{errors.biography}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={loading}>Save Profile</Button>
        </div>
      </div>
    </form>
  );
}
