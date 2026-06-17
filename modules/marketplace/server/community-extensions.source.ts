// Default-exported source for the `external:contributions` extension point. The
// common bridge discovers this lazily via the generated extension registry (no
// boot registration), then asks it for a tenant's installed+approved sandboxed
// community plugins contributing into a given host point (e.g. 'ai:provider').
// Host modules wrap the returned `invoke` in their own facade.

import type { ExternalContribution, ExternalContributionSource } from '@kuraykaraaslan/common/server/external-extensions';
import { runOnHost } from '@kuraykaraaslan/plugin_runtime/server/rpc/host-client';
import { listInstalledCommunityProviders, providerIsConfigured, type CommunityProviderContribution } from './community-providers';

/** Forward `<point>#<op>` into the plugin's isolate and parse the JSON result. */
function makeInvoke(tenantId: string, c: CommunityProviderContribution) {
  return async (op: string, input: unknown): Promise<unknown> => {
    const resultJson = await runOnHost({
      tenantId,
      sandbox: c.sandbox,
      kind: 'provider',
      target: `${c.point}#${op}`,
      payloadJson: JSON.stringify(input ?? {}),
      getBundle: c.getBundle,
    });
    return JSON.parse(resultJson);
  };
}

const source: ExternalContributionSource = async (tenantId, point) => {
  const contribs = await listInstalledCommunityProviders(tenantId, point);
  return Promise.all(
    contribs.map(async (c): Promise<ExternalContribution> => ({
      key: c.key,
      // Full manifest metadata (label, models, protocol, country, …) so hosts can
      // read what they need (ai → models; auth_acs → protocol).
      metadata: { ...c.metadata, label: c.label, models: c.models },
      configured: await providerIsConfigured(tenantId, c),
      invoke: makeInvoke(tenantId, c),
    })),
  );
};

export default source;
