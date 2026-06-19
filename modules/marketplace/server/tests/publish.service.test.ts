import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({
  env: { DATABASE_URL: 'postgresql://test', NODE_ENV: 'test' },
}));
vi.mock('@kuraykaraaslan/db', () => ({ getDataSource: vi.fn(), tenantDataSourceFor: vi.fn() }));
vi.mock('@kuraykaraaslan/audit_log/server/audit_log.service', () => ({ default: { log: vi.fn() } }));
vi.mock('@kuraykaraaslan/storage/server/storage.service', () => ({
  default: { uploadServerBuffer: vi.fn(async () => ({ key: 'k', url: 'http://x/k', bucket: 'b', provider: 'local' })) },
}));
vi.mock('@kuraykaraaslan/tenant/server/tenant.constants', () => ({ ROOT_TENANT_ID: 'root' }));

import { getDataSource } from '@kuraykaraaslan/db';
import { Publisher } from '../entities/publisher.entity';
import { PublishedModule } from '../entities/published_module.entity';
import { PublishedModuleVersion } from '../entities/published_module_version.entity';
import { CommunityInstall } from '../entities/community_install.entity';
import {
  submitVersion,
  setListingLifecycle,
  getMyListingDetail,
} from '../publish.service.next';

const TENANT = 'tenant-1';
const PUBLISHER_ID = 'pub-1';
const LISTING_ID = 'listing-1';

function matches(where: Record<string, unknown>) {
  return (row: Record<string, unknown>) => Object.entries(where).every(([k, v]) => row[k] === v);
}

class Repo {
  constructor(public pk: string, public rows: Record<string, any>[] = []) {}
  create(obj: Record<string, any>) { return { ...obj }; }
  async save(obj: Record<string, any>) {
    if (!obj[this.pk]) obj[this.pk] = `${this.pk}-${this.rows.length + 1}`;
    const i = this.rows.findIndex((r) => r[this.pk] === obj[this.pk]);
    if (i >= 0) this.rows[i] = obj; else this.rows.push(obj);
    return obj;
  }
  async findOne({ where }: { where: Record<string, unknown> }) { return this.rows.find(matches(where)) ?? null; }
  async find({ where, order }: { where?: Record<string, unknown>; order?: Record<string, 'ASC' | 'DESC'> } = {}) {
    let r = where ? this.rows.filter(matches(where)) : [...this.rows];
    if (order) {
      const [k, dir] = Object.entries(order)[0];
      r = r.sort((a, b) => (a[k] > b[k] ? 1 : -1) * (dir === 'DESC' ? -1 : 1));
    }
    return r;
  }
  async count({ where }: { where: Record<string, unknown> }) { return this.rows.filter(matches(where)).length; }
  async delete(where: Record<string, unknown>) {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !matches(where)(r));
    return { affected: before - this.rows.length };
  }
}

let repos: { pub: Repo; listing: Repo; version: Repo; install: Repo };

function wireDataSource() {
  const map = new Map<unknown, Repo>([
    [Publisher, repos.pub],
    [PublishedModule, repos.listing],
    [PublishedModuleVersion, repos.version],
    [CommunityInstall, repos.install],
  ]);
  (getDataSource as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    getRepository: (entity: unknown) => map.get(entity),
  });
}

const VALID_MANIFEST = JSON.stringify({ id: 'crm', name: 'CRM', version: '1.1.0' });

beforeEach(() => {
  repos = {
    pub: new Repo('publisherId', [{ publisherId: PUBLISHER_ID, ownerTenantId: TENANT, slug: 'acme', status: 'verified' }]),
    listing: new Repo('listingId', [{
      listingId: LISTING_ID, publisherId: PUBLISHER_ID, scopedName: '@acme/crm', moduleId: 'crm',
      name: 'CRM', status: 'draft', visibility: 'private', currentVersionId: null,
    }]),
    version: new Repo('versionId', [{
      versionId: 'v-1', listingId: LISTING_ID, version: '1.0.0', reviewStatus: 'approved', submittedAt: new Date('2026-01-01'),
    }]),
    install: new Repo('installId', []),
  };
  wireDataSource();
});

describe('submitVersion — semver enforcement', () => {
  it('rejects a version equal to the latest submitted', async () => {
    await expect(
      submitVersion(TENANT, LISTING_ID, { version: '1.0.0', manifestJson: JSON.stringify({ id: 'crm', name: 'CRM', version: '1.0.0' }) }),
    ).rejects.toThrow(/greater than the latest/);
  });

  it('rejects a version lower than the latest submitted', async () => {
    await expect(
      submitVersion(TENANT, LISTING_ID, { version: '0.9.0', manifestJson: JSON.stringify({ id: 'crm', name: 'CRM', version: '0.9.0' }) }),
    ).rejects.toThrow(/greater than the latest/);
  });

  it('accepts a higher version and moves the listing to in_review', async () => {
    const v = await submitVersion(TENANT, LISTING_ID, { version: '1.1.0', manifestJson: VALID_MANIFEST });
    expect(v.version).toBe('1.1.0');
    expect(v.reviewStatus).toBe('pending');
    const listing = await repos.listing.findOne({ where: { listingId: LISTING_ID } });
    expect(listing?.status).toBe('in_review');
  });
});

describe('setListingLifecycle', () => {
  it('unpublishes a published listing', async () => {
    repos.listing.rows[0].status = 'published';
    const l = await setListingLifecycle(TENANT, LISTING_ID, 'unpublish');
    expect(l.status).toBe('unpublished');
  });

  it('refuses to unpublish a draft listing', async () => {
    await expect(setListingLifecycle(TENANT, LISTING_ID, 'unpublish')).rejects.toThrow(/published/);
  });

  it('republishes an unpublished listing with an approved version', async () => {
    repos.listing.rows[0].status = 'unpublished';
    repos.listing.rows[0].currentVersionId = 'v-1';
    const l = await setListingLifecycle(TENANT, LISTING_ID, 'republish');
    expect(l.status).toBe('published');
  });
});

describe('getMyListingDetail', () => {
  it('returns version history and install stats for the owner', async () => {
    repos.install.rows.push(
      { installId: 'i1', listingId: LISTING_ID, tenantId: 't-a', active: true },
      { installId: 'i2', listingId: LISTING_ID, tenantId: 't-b', active: false },
    );
    const detail = await getMyListingDetail(TENANT, LISTING_ID);
    expect(detail.listing.listingId).toBe(LISTING_ID);
    expect(detail.versions).toHaveLength(1);
    expect(detail.stats).toEqual({ installs: 2, active: 1 });
  });

  it('refuses access to a listing the publisher does not own', async () => {
    repos.listing.rows[0].publisherId = 'someone-else';
    await expect(getMyListingDetail(TENANT, LISTING_ID)).rejects.toThrow(/Not your listing/);
  });
});
