// AUTO-GENERATED — generic SAML national-identity provider (sandboxed).
// Thin: both ops delegate to the host-side broker (host.saml.*), which signs the
// AuthnRequest and verifies the XML-DSig assertion in vetted code. The SP private/
// decryption keys live as plugin secrets and never enter the isolate.
globalThis.__plugin = {
  providers: {
    'auth_acs:provider': {
      generateAuthUrl: async ({ config, relayState }, host) => host.saml.generateAuthUrl(relayState, config),
      validateCallback: async ({ config, body }, host) => {
        const a = await host.saml.validateResponse(body, config);
        const attrs = (a && a.attributes) || {};
        const pick = (k) => (k && attrs[k] != null ? String(attrs[k]) : null);
        // Normalize the SPID/eIDAS 'TINIT-' fiscal-number prefix (no-op for others).
        const nationalId = (pick(config.attrNationalId) || (a && a.nameId) || '').replace(/^TINIT-/, '');
        return {
          nationalId,
          firstName: pick(config.attrFirstName),
          lastName: pick(config.attrLastName),
          country: config.country,
          nameId: a && a.nameId,
          assertionId: a && a.assertionId,
          sessionIndex: a && a.sessionIndex,
        };
      },
    },
  },
};
