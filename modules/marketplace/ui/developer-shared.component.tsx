'use client';
// Shared types, helpers, and small presentational pieces for the publisher
// (developer) dashboard and the per-listing detail page.
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';

export interface Publisher {
  publisherId: string;
  slug: string;
  displayName: string;
  contact?: string | null;
  website?: string | null;
  status: 'pending' | 'verified' | 'suspended';
}

export interface Listing {
  listingId: string;
  scopedName: string;
  name: string;
  moduleId: string;
  description?: string | null;
  icon?: string | null;
  tier?: string | null;
  tags?: string[] | null;
  repoUrl?: string | null;
  homepage?: string | null;
  status: ListingStatus;
  visibility: 'public' | 'private';
  currentVersionId?: string | null;
  updatedAt?: string;
}

export type ListingStatus = 'draft' | 'in_review' | 'published' | 'rejected' | 'unpublished';

export interface ListingVersion {
  versionId: string;
  version: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string | null;
  changelog?: string | null;
  readmeMd?: string | null;
  manifestJson?: string;
  packageRef?: string | null;
  bundleKey?: string | null;
  screenshots?: string[] | null;
  submittedAt?: string;
  reviewedAt?: string | null;
}

export interface ListingDetail {
  listing: Listing;
  versions: ListingVersion[];
  stats: { installs: number; active: number };
}

export function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export const inputCls =
  'w-full rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus';

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-error-fg">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-text-tertiary">{hint}</span>
      ) : null}
    </label>
  );
}

const STATUS_VARIANT: Record<ListingStatus, 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
  published: 'success',
  in_review: 'info',
  rejected: 'error',
  draft: 'neutral',
  unpublished: 'warning',
};

const STATUS_LABEL: Record<ListingStatus, string> = {
  published: 'Published',
  in_review: 'In review',
  rejected: 'Rejected',
  draft: 'Draft',
  unpublished: 'Unpublished',
};

export function StatusPill({ status, size = 'md' }: { status: ListingStatus; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'neutral'} size={size}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function VersionStatusBadge({ status }: { status: ListingVersion['reviewStatus'] }) {
  const map = { approved: 'success', rejected: 'error', pending: 'info' } as const;
  const label = { approved: 'Approved', rejected: 'Rejected', pending: 'Pending review' } as const;
  return <Badge variant={map[status] ?? 'neutral'} size="sm">{label[status] ?? status}</Badge>;
}

// Lifecycle legend — shown so publishers understand the status flow at a glance.
export function LifecycleLegend() {
  const steps = ['Draft', 'In review', 'Published'];
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-tertiary">
      {steps.map((s, i) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className="rounded-full bg-surface-sunken px-2 py-0.5">{s}</span>
          {i < steps.length - 1 && <span aria-hidden>→</span>}
        </span>
      ))}
      <span aria-hidden>·</span>
      <span className="rounded-full bg-error-subtle text-error-fg px-2 py-0.5">Rejected</span>
      <span className="rounded-full bg-warning-subtle text-warning-fg px-2 py-0.5">Unpublished</span>
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised px-4 py-3">
      <div className="text-2xl font-bold text-text-primary leading-tight">{value}</div>
      <div className="text-xs text-text-secondary mt-0.5">{label}</div>
    </div>
  );
}

export const CLIENT_SLUG_RE = /^[a-z][a-z0-9-]*$/;
export const CLIENT_RESERVED_SLUGS = new Set([
  'kuraykaraaslan', 'nb', 'system', 'admin', 'tenant', 'marketplace', 'common',
]);

/** Client-side semver check mirroring the server (x.y.z with optional -prerelease). */
export const CLIENT_SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/;

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  // Locale-stable, no time-of-day noise.
  return new Date(value).toISOString().slice(0, 10);
}
