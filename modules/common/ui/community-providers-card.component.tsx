'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import { Card } from '@kuraykaraaslan/common/ui/card.component';

interface CommunityListing {
  listingId: string;
  scopedName: string;
  name: string;
  icon?: string | null;
  points?: string[];
  installed?: boolean;
  active?: boolean;
}

/**
 * Uniform "providers from plugins" panel. Any provider module's settings tab drops
 * this in for its extension point (e.g. `auth_sso:provider`, `mail:provider`,
 * `sms:provider`, `storage:provider`, `ai:provider`, `payment:gateway`, …) and gets
 * the same layout: the tenant's published/installed community plugins for that point,
 * each with its real Active / Installed / Available state and an Install/Configure
 * link to the Marketplace (where the plugin's credentials live).
 */
export function CommunityProvidersCard({
  point, title = 'Providers', subtitle = 'Providers are community plugins — install & configure them in the Marketplace', tenantId: tenantIdProp,
}: {
  point: string;
  title?: string;
  subtitle?: string;
  /** Optional override; by default the tenant is read from the /tenant/[tenantId] route. */
  tenantId?: string;
}) {
  const params = useParams();
  const tenantId = tenantIdProp || (typeof params?.tenantId === 'string' ? params.tenantId : Array.isArray(params?.tenantId) ? params!.tenantId[0] : '');
  const [listings, setListings] = useState<CommunityListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/tenant/${tenantId}/api/marketplace/community`, { credentials: 'include' });
        const data = await res.json();
        if (cancelled) return;
        if (!data?.success) { setError(data?.message || 'Failed to load providers'); return; }
        // Only the tenant's INSTALLED plugins for this point — browsing/installing
        // available ones is the Marketplace's job, not this settings panel.
        const forPoint = (data.listings as CommunityListing[])
          .filter((l) => (l.points || []).includes(point) && l.installed);
        setListings(forPoint);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load providers');
      }
    })();
    return () => { cancelled = true; };
  }, [tenantId, point]);

  const marketplaceHref = `/tenant/${tenantId}/admin/marketplace`;

  return (
    <Card title={title} subtitle={subtitle}>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && listings === null && <p className="text-sm text-muted-foreground">Loading providers…</p>}
      {!error && listings && listings.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No providers installed for this feature. Install one from the{' '}
          <a href={marketplaceHref} className="text-primary underline">Marketplace</a>.
        </p>
      )}
      {!error && listings && listings.length > 0 && (
        <div className="space-y-2">
          {listings.map((l) => {
            const status = l.active ? 'Active' : 'Inactive';
            const statusClass = l.active ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600';
            return (
              <div key={l.listingId} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <div className="font-medium truncate">{l.name || l.scopedName}</div>
                  <div className="text-xs text-muted-foreground truncate">{l.scopedName}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>{status}</span>
                  <a href={marketplaceHref} className="text-muted-foreground hover:text-primary" title="Configure" aria-label="Configure">
                    <FontAwesomeIcon icon={faGear} className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
