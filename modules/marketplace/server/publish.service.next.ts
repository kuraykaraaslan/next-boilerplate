// Marketplace publishing: tenants apply to become verified publishers, then
// submit module *listings* (metadata + manifest + readme + screenshots, code not
// executed). Submissions are approval-gated (draft → in_review → published).
// System-scoped registry — uses the base DataSource, cross-tenant.

import { z } from 'zod';
import { getDataSource } from '@kuraykaraaslan/db';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import StorageService from '@kuraykaraaslan/storage/server/storage.service';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
import { Publisher, type PublisherStatus } from './entities/publisher.entity';
import { PublishedModule, type ListingVisibility } from './entities/published_module.entity';
import { PublishedModuleVersion } from './entities/published_module_version.entity';

const SLUG_RE = /^[a-z][a-z0-9-]*$/;
const RESERVED_SLUGS = new Set(['kuraykaraaslan', 'nb', 'system', 'admin', 'tenant', 'marketplace', 'common']);

// Minimal module.json contract a submitted manifest must satisfy (mirrors
// modules/module.schema.json's required fields + id/version patterns).
const manifestSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_]*$/, 'id must be lowercase letters/digits/underscores'),
    name: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version must be semver x.y.z'),
  })
  .passthrough();

export type ParsedManifest = z.infer<typeof manifestSchema>;

function parseManifest(manifestJson: string): ParsedManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(manifestJson);
  } catch {
    throw new Error('manifest is not valid JSON');
  }
  const res = manifestSchema.safeParse(raw);
  if (!res.success) {
    throw new Error(`invalid manifest: ${res.error.issues.map((i) => i.message).join('; ')}`);
  }
  return res.data;
}

// ── Publishers ───────────────────────────────────────────────────────────────

export async function getPublisherForTenant(tenantId: string): Promise<Publisher | null> {
  const ds = await getDataSource();
  return ds.getRepository(Publisher).findOne({ where: { ownerTenantId: tenantId } });
}

export async function applyAsPublisher(
  tenantId: string,
  input: { slug: string; displayName: string; contact?: string; website?: string },
  actorId?: string,
): Promise<Publisher> {
  const slug = input.slug?.trim().toLowerCase();
  if (!slug || !SLUG_RE.test(slug)) throw new Error(`Invalid slug "${input.slug}" — use lowercase letters, digits and hyphens.`);
  if (RESERVED_SLUGS.has(slug)) throw new Error(`Slug "${slug}" is reserved.`);

  const ds = await getDataSource();
  const repo = ds.getRepository(Publisher);

  const existingForTenant = await repo.findOne({ where: { ownerTenantId: tenantId } });
  if (existingForTenant) throw new Error('This tenant already has a publisher account.');
  const slugTaken = await repo.findOne({ where: { slug } });
  if (slugTaken) throw new Error(`Slug "${slug}" is already taken.`);

  const publisher = await repo.save(
    repo.create({
      ownerTenantId: tenantId,
      slug,
      displayName: input.displayName?.trim() || slug,
      contact: input.contact?.trim() || null,
      website: input.website?.trim() || null,
      status: 'pending',
    }),
  );
  await AuditLogService.log({
    tenantId,
    actorId: actorId ?? null,
    action: 'marketplace.publisher.apply',
    resourceType: 'publisher',
    resourceId: publisher.publisherId,
    metadata: { slug },
  });
  return publisher;
}

export async function listPublishers(status?: PublisherStatus): Promise<Publisher[]> {
  const ds = await getDataSource();
  return ds.getRepository(Publisher).find({
    where: status ? { status } : {},
    order: { createdAt: 'DESC' },
  });
}

export async function setPublisherStatus(
  publisherId: string,
  status: PublisherStatus,
  reviewerId?: string,
): Promise<Publisher> {
  const ds = await getDataSource();
  const repo = ds.getRepository(Publisher);
  const publisher = await repo.findOne({ where: { publisherId } });
  if (!publisher) throw new Error('Publisher not found.');
  publisher.status = status;
  publisher.verifiedAt = status === 'verified' ? new Date() : publisher.verifiedAt;
  publisher.verifiedBy = status === 'verified' ? reviewerId ?? null : publisher.verifiedBy;
  await repo.save(publisher);
  await AuditLogService.log({
    tenantId: ROOT_TENANT_ID,
    actorId: reviewerId ?? null,
    action: `marketplace.publisher.${status}`,
    resourceType: 'publisher',
    resourceId: publisherId,
  });
  return publisher;
}

// ── Listings ─────────────────────────────────────────────────────────────────

async function requireVerifiedPublisher(tenantId: string): Promise<Publisher> {
  const publisher = await getPublisherForTenant(tenantId);
  if (!publisher) throw new Error('No publisher account — apply first.');
  if (publisher.status !== 'verified') throw new Error(`Publisher is "${publisher.status}" — must be verified to publish.`);
  return publisher;
}

export async function listMyListings(tenantId: string): Promise<PublishedModule[]> {
  const publisher = await getPublisherForTenant(tenantId);
  if (!publisher) return [];
  const ds = await getDataSource();
  return ds.getRepository(PublishedModule).find({
    where: { publisherId: publisher.publisherId },
    order: { updatedAt: 'DESC' },
  });
}

export async function upsertListing(
  tenantId: string,
  input: {
    listingId?: string;
    moduleId: string;
    name: string;
    description?: string;
    icon?: string;
    tier?: string;
    tags?: string[];
    repoUrl?: string;
    homepage?: string;
    visibility?: ListingVisibility;
  },
  actorId?: string,
): Promise<PublishedModule> {
  const publisher = await requireVerifiedPublisher(tenantId);
  const ds = await getDataSource();
  const repo = ds.getRepository(PublishedModule);

  const moduleId = input.moduleId?.trim().toLowerCase();
  if (!moduleId || !/^[a-z][a-z0-9_]*$/.test(moduleId)) {
    throw new Error('moduleId must be lowercase letters, digits and underscores.');
  }
  const scopedName = `@${publisher.slug}/${moduleId}`;

  let listing: PublishedModule | null = null;
  if (input.listingId) {
    listing = await repo.findOne({ where: { listingId: input.listingId } });
    if (!listing) throw new Error('Listing not found.');
    if (listing.publisherId !== publisher.publisherId) throw new Error('Not your listing.');
  } else {
    const taken = await repo.findOne({ where: { scopedName } });
    if (taken) throw new Error(`Listing "${scopedName}" already exists.`);
  }

  const patch = {
    publisherId: publisher.publisherId,
    scopedName,
    moduleId,
    name: input.name?.trim() || moduleId,
    description: input.description?.trim() || null,
    icon: input.icon?.trim() || null,
    tier: input.tier?.trim() || null,
    tags: input.tags ?? null,
    repoUrl: input.repoUrl?.trim() || null,
    homepage: input.homepage?.trim() || null,
    visibility: input.visibility ?? listing?.visibility ?? 'private',
  };
  listing = await repo.save(repo.create({ ...(listing ?? {}), ...patch }));
  await AuditLogService.log({
    tenantId,
    actorId: actorId ?? null,
    action: input.listingId ? 'marketplace.listing.update' : 'marketplace.listing.create',
    resourceType: 'listing',
    resourceId: listing.listingId,
    metadata: { scopedName },
  });
  return listing;
}

export async function submitVersion(
  tenantId: string,
  listingId: string,
  input: {
    version: string;
    manifestJson: string;
    readmeMd?: string;
    changelog?: string;
    screenshots?: string[];
    packageRef?: string;
    /** Base64 of the built, isolate-loadable bundle (single IIFE/UMD JS). */
    bundleBase64?: string;
  },
  actorId?: string,
): Promise<PublishedModuleVersion> {
  const publisher = await requireVerifiedPublisher(tenantId);
  const ds = await getDataSource();
  const listingRepo = ds.getRepository(PublishedModule);
  const versionRepo = ds.getRepository(PublishedModuleVersion);

  const listing = await listingRepo.findOne({ where: { listingId } });
  if (!listing) throw new Error('Listing not found.');
  if (listing.publisherId !== publisher.publisherId) throw new Error('Not your listing.');

  // Validate the manifest (throws on invalid). The `sandbox` block (if present)
  // is the capability/limit grant the reviewer will approve.
  const manifest = parseManifest(input.manifestJson) as { sandbox?: unknown };
  if (!/^\d+\.\d+\.\d+$/.test(input.version)) throw new Error('version must be semver x.y.z');

  // Store the runnable bundle system-side (ROOT) so the host can load it on install.
  let bundleKey: string | null = null;
  if (input.bundleBase64) {
    const buffer = Buffer.from(input.bundleBase64, 'base64');
    if (buffer.byteLength > 5_000_000) throw new Error('bundle too large (max 5MB)');
    const res = await StorageService.uploadServerBuffer(ROOT_TENANT_ID, {
      buffer,
      filename: `${listing.scopedName.replace(/[^a-z0-9_.-]/gi, '_')}-${input.version}.js`,
      contentType: 'application/javascript',
      folder: 'plugin-bundles',
    });
    bundleKey = res.key;
  }

  const version = await versionRepo.save(
    versionRepo.create({
      listingId,
      version: input.version,
      manifestJson: input.manifestJson,
      readmeMd: input.readmeMd ?? null,
      changelog: input.changelog ?? null,
      screenshots: input.screenshots ?? null,
      packageRef: input.packageRef ?? null,
      bundleKey,
      sandboxJson: manifest.sandbox ? JSON.stringify(manifest.sandbox) : null,
      reviewStatus: 'pending',
    }),
  );
  listing.status = 'in_review';
  await listingRepo.save(listing);

  await AuditLogService.log({
    tenantId,
    actorId: actorId ?? null,
    action: 'marketplace.version.submit',
    resourceType: 'listing_version',
    resourceId: version.versionId,
    metadata: { listingId, version: input.version },
  });
  return version;
}

// ── Review (super-admin) ───────────────────────────────────────────────────────

export interface ReviewQueueItem {
  version: PublishedModuleVersion;
  listing: PublishedModule;
  publisher: Publisher | null;
}

export async function listReviewQueue(): Promise<ReviewQueueItem[]> {
  const ds = await getDataSource();
  const versions = await ds.getRepository(PublishedModuleVersion).find({
    where: { reviewStatus: 'pending' },
    order: { submittedAt: 'ASC' },
  });
  const listingRepo = ds.getRepository(PublishedModule);
  const publisherRepo = ds.getRepository(Publisher);
  const out: ReviewQueueItem[] = [];
  for (const version of versions) {
    const listing = await listingRepo.findOne({ where: { listingId: version.listingId } });
    if (!listing) continue;
    const publisher = await publisherRepo.findOne({ where: { publisherId: listing.publisherId } });
    out.push({ version, listing, publisher });
  }
  return out;
}

export async function reviewVersion(
  versionId: string,
  decision: 'approve' | 'reject',
  notes: string | undefined,
  reviewerId?: string,
): Promise<PublishedModuleVersion> {
  const ds = await getDataSource();
  const versionRepo = ds.getRepository(PublishedModuleVersion);
  const listingRepo = ds.getRepository(PublishedModule);

  const version = await versionRepo.findOne({ where: { versionId } });
  if (!version) throw new Error('Version not found.');
  const listing = await listingRepo.findOne({ where: { listingId: version.listingId } });
  if (!listing) throw new Error('Listing not found.');

  version.reviewStatus = decision === 'approve' ? 'approved' : 'rejected';
  version.reviewNotes = notes ?? null;
  version.reviewedBy = reviewerId ?? null;
  version.reviewedAt = new Date();
  await versionRepo.save(version);

  if (decision === 'approve') {
    listing.status = 'published';
    listing.currentVersionId = version.versionId;
  } else {
    listing.status = 'rejected';
  }
  await listingRepo.save(listing);

  await AuditLogService.log({
    tenantId: ROOT_TENANT_ID,
    actorId: reviewerId ?? null,
    action: `marketplace.version.${decision}`,
    resourceType: 'listing_version',
    resourceId: versionId,
    metadata: { listingId: listing.listingId, notes: notes ?? null },
  });
  return version;
}

// ── Consumer-facing community catalog ────────────────────────────────────────

export interface CommunityListing {
  listingId: string;
  scopedName: string;
  name: string;
  description: string | null;
  icon: string | null;
  tier: string | null;
  tags: string[] | null;
  repoUrl: string | null;
  homepage: string | null;
  publisherSlug: string | null;
  version: string | null;
}

/** Published + public listings for the consumer "Community" catalog section. */
export async function listPublicListings(): Promise<CommunityListing[]> {
  const ds = await getDataSource();
  const listings = await ds.getRepository(PublishedModule).find({
    where: { status: 'published', visibility: 'public' },
    order: { updatedAt: 'DESC' },
  });
  const publisherRepo = ds.getRepository(Publisher);
  const versionRepo = ds.getRepository(PublishedModuleVersion);
  const out: CommunityListing[] = [];
  for (const l of listings) {
    const publisher = await publisherRepo.findOne({ where: { publisherId: l.publisherId } });
    const version = l.currentVersionId
      ? await versionRepo.findOne({ where: { versionId: l.currentVersionId } })
      : null;
    out.push({
      listingId: l.listingId,
      scopedName: l.scopedName,
      name: l.name,
      description: l.description,
      icon: l.icon,
      tier: l.tier,
      tags: l.tags,
      repoUrl: l.repoUrl,
      homepage: l.homepage,
      publisherSlug: publisher?.slug ?? null,
      version: version?.version ?? null,
    });
  }
  return out;
}
