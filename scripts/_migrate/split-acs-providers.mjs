// Extract the in-tree national-identity (ACS) providers into satellite modules
// (auth_acs_<key>) contributing to the auth_acs:provider extension point, then
// rewrite auth_acs providers/index to resolve purely via the extension registry.
// Base classes (base.saml.provider, base.oidc.provider) STAY in the host —
// satellites extend them via @kuraykaraaslan/auth_acs/server/providers/base.*.
import fs from 'node:fs';

const HOST = 'modules/auth_acs/server/providers';
// key -> { cls, label, country }
const P = {
  tr_edevlet: { cls: 'TrEdevletProvider', label: 'e-Devlet ile Giriş', country: 'TR' },
  ct_edevlet: { cls: 'CtEdevletProvider', label: 'e-Devlet (KKTC) ile Giriş', country: 'CT' },
  eu_eidas: { cls: 'EuEidasProvider', label: 'eIDAS', country: 'EU' },
  it_spid: { cls: 'ItSpidProvider', label: 'Entra con SPID', country: 'IT' },
  es_clave: { cls: 'EsClaveProvider', label: 'Cl@ve', country: 'ES' },
  de_eid: { cls: 'DeEidProvider', label: 'Online-Ausweis (eID)', country: 'DE' },
  az_mygovid: { cls: 'AzMygovidProvider', label: 'MyGov ID', country: 'AZ' },
  uz_oneid: { cls: 'UzOneidProvider', label: 'OneID', country: 'UZ' },
  kz_egov: { cls: 'KzEgovProvider', label: 'eGov.kz', country: 'KZ' },
  kg_tunduk: { cls: 'KgTundukProvider', label: 'Tunduk', country: 'KG' },
  us_login_gov: { cls: 'UsLoginGovProvider', label: 'Login.gov', country: 'US' },
  us_id_me: { cls: 'UsIdMeProvider', label: 'ID.me', country: 'US' },
  esia_ru: { cls: 'EsiaProvider', label: 'Госуслуги', country: 'RU' },
};

// Rewrite intra-host relative imports to absolute @kuraykaraaslan/auth_acs/server paths so
// the moved provider file resolves from its new satellite location.
const fixImports = (s) =>
  s
    .replace(/from '\.\/base\.saml\.provider'/g, "from '@kuraykaraaslan/auth_acs/server/providers/base.saml.provider'")
    .replace(/from '\.\/base\.oidc\.provider'/g, "from '@kuraykaraaslan/auth_acs/server/providers/base.oidc.provider'")
    .replace(/from '\.\.\//g, "from '@kuraykaraaslan/auth_acs/server/"); // ../auth_acs.X -> @kuraykaraaslan/auth_acs/server/auth_acs.X

for (const [key, meta] of Object.entries(P)) {
  const mod = `modules/auth_acs_${key}`;
  const sdir = `${mod}/server/providers`;
  fs.mkdirSync(sdir, { recursive: true });

  const from = `${HOST}/${key}.provider.ts`;
  fs.writeFileSync(`${sdir}/${key}.provider.ts`, fixImports(fs.readFileSync(from, 'utf8')));
  fs.rmSync(from);

  fs.writeFileSync(
    `${mod}/server/${key}.extension.ts`,
    `import type { AcsProviderContribution } from '@kuraykaraaslan/auth_acs/server/auth_acs.provider.types';\n` +
      `import { ${meta.cls} } from './providers/${key}.provider';\n\n` +
      `/**\n * ${meta.label} (${meta.country}) contribution for the \`auth_acs:provider\` extension\n` +
      ` * point. The host (auth_acs providers/index) discovers this via the extension\n` +
      ` * registry and never imports ${meta.cls} directly.\n */\n` +
      `const contribution: AcsProviderContribution = {\n  key: '${key}',\n  create: () => new ${meta.cls}(),\n};\n\nexport default contribution;\n`,
  );

  fs.writeFileSync(
    `${mod}/module.json`,
    JSON.stringify(
      {
        $schema: '../module.schema.json',
        id: `auth_acs_${key}`,
        name: `${meta.label} (${meta.country})`,
        description: `${meta.label} national-identity provider, contributed into the auth_acs:provider extension point.`,
        version: '1.0.0',
        icon: 'fas fa-id-card',
        tags: ['identity', 'auth', 'acs', 'government', 'provider'],
        priority: 18,
        dependencies: { requires: ['auth_acs', 'auth_saml', 'auth_oidc', 'env', 'common'] },
        author: 'Kuray Karaaslan',
        homepage: `https://github.com/kuraykaraaslan/next-boilerplate/tree/main/modules/auth_acs_${key}`,
        license: 'CC-BY-NC-ND-4.0',
        extensions: [
          {
            point: 'auth_acs:provider',
            key,
            export: `auth_acs_${key}/server/${key}.extension`,
            metadata: { label: meta.label, country: meta.country },
          },
        ],
      },
      null,
      2,
    ) + '\n',
  );

  fs.writeFileSync(
    `${mod}/package.json`,
    JSON.stringify({ name: `@kuraykaraaslan/auth_acs_${key}`, version: '0.0.0', private: true, type: 'module', exports: {} }, null, 2) + '\n',
  );
  console.log(`extracted ${key} -> ${mod}`);
}

// Rewrite host providers/index.ts: extension-only async resolution.
const IDX = `${HOST}/index.ts`;
fs.writeFileSync(
  IDX,
  `import { extensionRegistry } from '@kuraykaraaslan/common/server/extension-registry';\n` +
    `import type { AcsProvider } from '../auth_acs.enums';\n` +
    `import type { AcsProviderService } from '../auth_acs.types';\n` +
    `import type { AcsProviderContribution } from '../auth_acs.provider.types';\n\n` +
    `const ACS_PROVIDER_POINT = 'auth_acs:provider';\n` +
    `const providerInstances: Partial<Record<AcsProvider, AcsProviderService>> = {};\n\n` +
    `/**\n` +
    ` * Resolve the national-identity provider implementation for a key. Every\n` +
    ` * provider lives in its own satellite module (auth_acs_<key>) and is discovered\n` +
    ` * via the auth_acs:provider extension registry; instances are cached per key.\n` +
    ` * Config is read per-construction inside the provider (so a config change — e.g.\n` +
    ` * in tests after mutating ACS_PROVIDER_MAP — takes effect on the next resolve\n` +
    ` * once the cache is reset).\n` +
    ` */\n` +
    `export async function getAcsProvider(provider: AcsProvider): Promise<AcsProviderService> {\n` +
    `  const cached = providerInstances[provider];\n` +
    `  if (cached) return cached;\n\n` +
    `  const contrib = extensionRegistry\n` +
    `    .getContributions(ACS_PROVIDER_POINT)\n` +
    `    .find((c) => c.key === provider);\n` +
    `  if (!contrib) throw new Error(\`Unknown ACS provider: \${provider}\`);\n\n` +
    `  const impl = await extensionRegistry.load<AcsProviderContribution>(contrib);\n` +
    `  const instance = impl.create();\n` +
    `  providerInstances[provider] = instance;\n` +
    `  return instance;\n` +
    `}\n`,
);
console.log('rewrote auth_acs providers/index (extension-only async)');
