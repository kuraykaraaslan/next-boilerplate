'use client';
// Trusted host side of the sandboxed plugin UI. Renders the plugin's UI from a
// SEPARATE origin in an iframe with `sandbox="allow-scripts"` (no allow-same-origin,
// so the iframe is an opaque origin and cannot read the app's cookies/storage). The
// only bridge is postMessage: the frame validates the message origin + source, then
// proxies data calls to the plugin's OWN scoped API (/api/plugins/<listingId>/*)
// using the logged-in tenant's session. The iframe never gets credentials.
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';

const PLUGIN_ORIGIN = process.env.NEXT_PUBLIC_PLUGIN_UI_ORIGIN ?? '';

export function PluginFrame({ tenantId, listingId }: { tenantId: string; listingId: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(480);

  const onMessage = useCallback(async (ev: MessageEvent) => {
    // Only trust messages from the configured plugin origin AND our own iframe.
    if (PLUGIN_ORIGIN && ev.origin !== PLUGIN_ORIGIN) return;
    const frameWin = ref.current?.contentWindow;
    if (!frameWin || ev.source !== frameWin) return;
    const d = ev.data as { type?: string; id?: string; height?: number; request?: { method?: string; path?: string; query?: Record<string, string>; body?: unknown } };
    if (!d || typeof d.type !== 'string') return;

    if (d.type === 'pluginResize' && typeof d.height === 'number') {
      setHeight(Math.min(Math.max(d.height, 120), 4000));
      return;
    }
    if (d.type === 'pluginRpc' && typeof d.id === 'string' && d.request) {
      const target = PLUGIN_ORIGIN || '*';
      const reply = (payload: Record<string, unknown>) => frameWin.postMessage({ type: 'pluginRpcResult', id: d.id, ...payload }, target);
      try {
        const r = d.request;
        // Scope to the plugin's own API; strip traversal.
        const safePath = String(r.path ?? '').replace(/^\/+/, '').split('/').filter((s) => s && s !== '..').join('/');
        const qs = r.query ? `?${new URLSearchParams(r.query).toString()}` : '';
        const method = (r.method ?? 'GET').toUpperCase();
        const res = await api.request({
          url: `/tenant/${tenantId}/api/plugins/${listingId}/${safePath}${qs}`,
          method,
          data: ['GET', 'HEAD'].includes(method) ? undefined : r.body,
        });
        reply({ result: res.data });
      } catch (e: any) {
        reply({ error: e?.response?.data?.message ?? e?.message ?? 'request failed' });
      }
    }
  }, [tenantId, listingId]);

  useEffect(() => {
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onMessage]);

  if (!PLUGIN_ORIGIN) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm text-text-secondary">
        Plugin UI origin is not configured. Set <code>NEXT_PUBLIC_PLUGIN_UI_ORIGIN</code> to a
        separate origin (e.g. <code>https://plugins.example.com</code>) that serves plugin UI bundles.
      </div>
    );
  }

  return (
    <iframe
      ref={ref}
      src={`${PLUGIN_ORIGIN}/p/${listingId}/`}
      sandbox="allow-scripts allow-forms"
      referrerPolicy="no-referrer"
      className="w-full rounded-lg border border-border bg-surface-raised"
      style={{ height }}
      title={`plugin-${listingId}`}
    />
  );
}
