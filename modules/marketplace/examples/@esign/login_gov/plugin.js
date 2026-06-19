// Login.gov (US) eID provider — sandboxed. Ported from the built-in esign_login_gov
// adapter, which is intentionally a marker: Login.gov uses an OIDC redirect flow
// (handled by the auth_sso OIDC bridge), not the QR/PIN poll flow. initiateLogin
// therefore returns a capability-missing error with a redirect hint; there is no
// poll-style flow. The provider exists so the country picker surfaces US.

globalThis.__plugin = {
  providers: {
    'esign:provider': {
      initiateLogin: async (_input, host) => {
        const clientId = await host.settings.get('loginGovClientId');
        throw new Error(
          'provider_capability_missing: Login.gov uses an OIDC redirect flow. ' +
          'Bridge via /api/auth/sso/login_gov on the root tenant' +
          (clientId ? ` (client ${clientId}).` : '.'),
        );
      },
      pollLoginResult: async () => {
        throw new Error('Login.gov does not support poll-style login flows');
      },
    },
  },
};
