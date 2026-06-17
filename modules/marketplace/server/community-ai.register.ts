// Boot-time wiring: registers sandboxed community plugins that contribute into
// `ai:provider` as an external AI provider source, so AIProviderService lists and
// builds them alongside first-party providers. Importing this file performs the
// registration (side effect) — done once from instrumentation.ts.

import { registerExternalAIProviderSource } from '@kuraykaraaslan/ai/server/ai.external-providers';
import { listInstalledCommunityProviders } from './community-providers';
import { IsolatedAIProvider } from './isolated-ai-provider';

registerExternalAIProviderSource(async (tenantId) => {
  const contribs = await listInstalledCommunityProviders(tenantId, 'ai:provider');
  return contribs.map((c) => ({
    key: c.key,
    label: c.label,
    models: c.models,
    build: () => new IsolatedAIProvider({ tenantId, key: c.key, models: c.models, sandbox: c.sandbox, getBundle: c.getBundle }),
  }));
});
