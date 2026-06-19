// Web Push (VAPID) provider (sandboxed). A V8 isolate can't do the Web Push payload
// encryption (ECDH + HKDF + AES-GCM) or hold the VAPID private key, so the plugin
// orchestrates the host `webpush` capability (web-push library); the VAPID key pair
// is resolved + used host-side. Ported from the built-in notification_push send path.
globalThis.__plugin = {
  providers: {
    'push:provider': {
      send: async ({ subscription, payload }, host) => {
        const sub = subscription || {};
        return await host.webpush.send(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          JSON.stringify(payload || {}),
        );
      },
    },
  },
};
