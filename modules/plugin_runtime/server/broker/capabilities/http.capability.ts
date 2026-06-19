// http: SSRF-guarded, allowlisted egress with host-side signed-secret injection.
import { assertSafeWebhookUrl } from '@kuraykaraaslan/webhook/server/webhook.ssrf';
import type { Json } from '../../../sdk/types';
import { substituteSecrets, resolveSecret, type BrokerCtx } from '../broker.context';

export const http = {
  async fetch(
    ctx: BrokerCtx,
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string; bodyBase64?: string; timeoutMs?: number; basic?: { username: string; secretName: string } },
  ): Promise<Json> {
    // Substitute {{secret:NAME}} in the URL too (e.g. WeChat's query-string client
    // secret), then re-validate the FINAL host — the allowlist + SSRF checks run on
    // the substituted URL, so a secret can never redirect egress off the allowlist.
    const substitutedUrl = await substituteSecrets(ctx, String(url));
    let parsed: URL;
    try { parsed = new URL(substitutedUrl); } catch { throw new Error('invalid url'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('only http(s) allowed');
    if (!ctx.httpAllowlist.includes(parsed.host)) throw new Error(`host not in allowlist: ${parsed.host}`);
    await assertSafeWebhookUrl(parsed.toString()); // DNS-rebinding-safe SSRF check
    const controller = new AbortController();
    const timeout = Math.min(init?.timeoutMs ?? ctx.limits.httpTimeoutMs, ctx.limits.httpTimeoutMs);
    const t = setTimeout(() => controller.abort(), timeout);
    try {
      // Inject any {{secret:NAME}} placeholders host-side (signed egress).
      const reqHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(init?.headers ?? {})) reqHeaders[k] = await substituteSecrets(ctx, String(v));
      // Basic auth built host-side so the secret is base64'd correctly (the isolate
      // can't base64 a {{secret:…}} placeholder). Used by e.g. Twitter's token endpoint.
      if (init?.basic) {
        const cred = `${init.basic.username}:${await resolveSecret(ctx, init.basic.secretName)}`;
        reqHeaders['authorization'] = `Basic ${Buffer.from(cred).toString('base64')}`;
      }
      // bodyBase64: raw binary request body (e.g. an S3 PutObject upload) the isolate
      // can't carry as a string — decoded host-side, no secret substitution.
      const reqBody = init?.bodyBase64 != null
        ? Buffer.from(String(init.bodyBase64), 'base64')
        : (init?.body != null ? await substituteSecrets(ctx, String(init.body)) : undefined);
      const res = await fetch(parsed.toString(), {
        method: init?.method ?? 'GET',
        headers: reqHeaders,
        body: reqBody,
        signal: controller.signal,
        redirect: 'manual', // do not silently follow redirects past the allowlist
      });
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > ctx.limits.httpMaxBytes) throw new Error('response too large');
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      return { status: res.status, headers: resHeaders, body: buf.toString('utf8') } as Json;
    } finally {
      clearTimeout(t);
    }
  },
};
