// Tiny client SDK that a plugin's UI bundle (served from the SEPARATE plugin origin,
// inside the sandboxed iframe) uses to talk to its own backend. It never holds app
// credentials — it postMessages the parent frame, which proxies the call to
// /api/plugins/<listingId>/* using the logged-in tenant's session.
//
// Plugin UI authors import this; the host frame (plugin-frame.component) is the
// trusted counterpart that validates origin and brokers the request.

export interface PluginClientRequest {
  method?: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}

interface Pending { resolve: (v: unknown) => void; reject: (e: Error) => void; }

const pending = new Map<string, Pending>();
let seq = 0;
let listening = false;
let parentOrigin = '*';

function ensureListener() {
  if (listening) return;
  listening = true;
  window.addEventListener('message', (ev: MessageEvent) => {
    const d = ev.data;
    if (!d || d.type !== 'pluginRpcResult' || typeof d.id !== 'string') return;
    const p = pending.get(d.id);
    if (!p) return;
    pending.delete(d.id);
    if (d.error) p.reject(new Error(String(d.error)));
    else p.resolve(d.result);
  });
}

/** Call the plugin's own backend. Resolves with the JSON body the handler returned. */
export function pluginFetch<T = unknown>(req: PluginClientRequest): Promise<T> {
  ensureListener();
  const id = `rpc_${++seq}`;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    window.parent.postMessage({ type: 'pluginRpc', id, request: req }, parentOrigin);
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('plugin RPC timed out')); } }, 20000);
  });
}

/** Tell the host frame the content height so it can size the iframe. */
export function pluginResize(height: number): void {
  window.parent.postMessage({ type: 'pluginResize', height }, parentOrigin);
}

/** Optionally pin the expected parent (app) origin for postMessage targeting. */
export function setHostOrigin(origin: string): void { parentOrigin = origin; }
