// Extract the in-tree e-invoicing adapters into satellite modules
// (invoice_<key>) contributing to the invoice:adapter extension point, then
// rewrite invoice adapters/registry to resolve purely via the extension
// registry. SHARED helpers (base.adapter, xml.util, cii_xml) and the
// InvoiceAdapter contract STAY in the host; single-adapter helpers move with
// their adapter into the satellite.
import fs from 'node:fs';

const HOST = 'modules/invoice/server/adapters';

// key -> { cls (default export), kind, code, label, files: [moved into satellite] }
const A = {
  // NOTE: tr_gib_direct.client/.types intentionally STAY in the host — the host
  // service invoice.adapter.service (TR e-Arşiv SMS finalisation) depends on the
  // GİB client. The satellite imports it back from
  // @kuraykaraaslan/invoice/server/adapters/tr_gib_direct.client (satellite -> host).
  tr_earsiv: {
    cls: 'TrEarsivAdapter', kind: 'region', code: 'TR', label: 'e-Arşiv (TR)',
    files: ['tr_earsiv.adapter.ts', 'tr_earsiv.format.ts', 'tr_earsiv.portal.ts', 'tr_earsiv.seller.ts',
      'tr_earsiv.submit.ts', 'tr_earsiv.ubl.ts', 'tr_foriba.client.ts', 'tr_logo.client.ts',
      'tr_validators.ts', 'tr_vat_rates.ts'],
  },
  eu_peppol: { cls: 'EuPeppolAdapter', kind: 'region', code: 'EU', label: 'Peppol BIS (EU)', files: ['eu_peppol.adapter.ts', 'eu_ubl.ts'] },
  us_standard: { cls: 'UsStandardAdapter', kind: 'region', code: 'US', label: 'US Standard (Stripe Tax)', files: ['us_standard.adapter.ts'] },
  it_fatturapa: { cls: 'ItFatturaPaAdapter', kind: 'country', code: 'IT', label: 'FatturaPA (IT)', files: ['it_fatturapa.adapter.ts', 'it_fatturapa.builder.ts'] },
  fr_choruspro: { cls: 'FrChorusProAdapter', kind: 'country', code: 'FR', label: 'Chorus Pro (FR)', files: ['fr_choruspro.adapter.ts'] },
  de_zugferd: { cls: 'DeZugferdAdapter', kind: 'country', code: 'DE', label: 'ZUGFeRD (DE)', files: ['de_zugferd.adapter.ts'] },
  mx_cfdi: { cls: 'MxCfdiAdapter', kind: 'country', code: 'MX', label: 'CFDI (MX)', files: ['mx_cfdi.adapter.ts', 'mx_cfdi.builder.ts'] },
  in_gst: { cls: 'InGstAdapter', kind: 'country', code: 'IN', label: 'GST IRP (IN)', files: ['in_gst.adapter.ts', 'in_gst.builder.ts'] },
};

// Rewrite intra-host imports of SHARED host files to absolute @nb paths; leave
// satellite-local relative imports (moved-together helpers) untouched.
const fixImports = (s) =>
  s
    .replace(/from '\.\/base\.adapter'/g, "from '@kuraykaraaslan/invoice/server/adapters/base.adapter'")
    .replace(/from '\.\/cii_xml'/g, "from '@kuraykaraaslan/invoice/server/adapters/cii_xml'")
    .replace(/from '\.\/xml\.util'/g, "from '@kuraykaraaslan/invoice/server/adapters/xml.util'")
    // GİB client/types stay in the host (used by invoice.adapter.service); the
    // satellite (tr_earsiv.portal/.submit) imports them back from the host.
    .replace(/from '\.\/tr_gib_direct\.client'/g, "from '@kuraykaraaslan/invoice/server/adapters/tr_gib_direct.client'")
    .replace(/from '\.\/tr_gib_direct\.types'/g, "from '@kuraykaraaslan/invoice/server/adapters/tr_gib_direct.types'")
    .replace(/from '\.\.\//g, "from '@kuraykaraaslan/invoice/server/"); // ../entities/X, ../invoice.signature.service -> @kuraykaraaslan/invoice/server/...

for (const [key, meta] of Object.entries(A)) {
  const mod = `modules/invoice_${key}`;
  const sdir = `${mod}/server/adapters`;
  fs.mkdirSync(sdir, { recursive: true });

  for (const file of meta.files) {
    const from = `${HOST}/${file}`;
    fs.writeFileSync(`${sdir}/${file}`, fixImports(fs.readFileSync(from, 'utf8')));
    fs.rmSync(from);
  }

  fs.writeFileSync(
    `${mod}/server/${key}.extension.ts`,
    `import type { InvoiceAdapterContribution } from '@kuraykaraaslan/invoice/server/adapters/invoice.adapter.types';\n` +
      `import ${meta.cls} from './adapters/${key}.adapter';\n\n` +
      `/**\n * ${meta.label} contribution for the \`invoice:adapter\` extension point. The host\n` +
      ` * (invoice adapters/registry) discovers this via the extension registry and never\n` +
      ` * imports ${meta.cls} directly. Routing key is in the manifest metadata\n` +
      ` * ({ kind: '${meta.kind}', code: '${meta.code}' }).\n */\n` +
      `const contribution: InvoiceAdapterContribution = {\n  key: '${key}',\n  create: () => new ${meta.cls}(),\n};\n\nexport default contribution;\n`,
  );

  fs.writeFileSync(
    `${mod}/module.json`,
    JSON.stringify(
      {
        $schema: '../module.schema.json',
        id: `invoice_${key}`,
        name: `${meta.label} e-Invoicing`,
        description: `${meta.label} e-invoicing adapter, contributed into the invoice:adapter extension point.`,
        version: '1.0.0',
        icon: 'fas fa-file-invoice',
        tags: ['invoice', 'billing', 'compliance', 'tax', 'adapter'],
        priority: 31,
        dependencies: { requires: ['invoice', 'setting', 'logger', 'common'] },
        author: 'Kuray Karaaslan',
        homepage: `https://github.com/kuraykaraaslan/next-boilerplate/tree/main/modules/invoice_${key}`,
        license: 'CC-BY-NC-ND-4.0',
        extensions: [
          {
            point: 'invoice:adapter',
            key,
            export: `invoice_${key}/server/${key}.extension`,
            metadata: { kind: meta.kind, code: meta.code, label: meta.label },
          },
        ],
      },
      null,
      2,
    ) + '\n',
  );

  fs.writeFileSync(
    `${mod}/package.json`,
    JSON.stringify({ name: `@kuraykaraaslan/invoice_${key}`, version: '0.0.0', private: true, type: 'module', exports: {} }, null, 2) + '\n',
  );
  console.log(`extracted ${key} -> ${mod} (${meta.files.length} file(s))`);
}

// Rewrite host adapters/registry.ts: extension-only async resolution. Region vs
// issuer-country routing is read off each contribution's metadata.
fs.writeFileSync(
  `${HOST}/registry.ts`,
  `import { extensionRegistry } from '@kuraykaraaslan/common/server/extension-registry';\n` +
    `import SettingService from '@kuraykaraaslan/setting/server/setting.service';\n` +
    `import type { InvoiceAdapter } from './base.adapter';\n` +
    `import type { InvoiceAdapterContribution, InvoiceAdapterMetadata } from './invoice.adapter.types';\n\n` +
    `const INVOICE_ADAPTER_POINT = 'invoice:adapter';\n` +
    `const instances = new Map<string, InvoiceAdapter>();\n\n` +
    `/** Read & normalise the routing metadata off a contribution; null if malformed. */\n` +
    `function adapterMeta(metadata: unknown): InvoiceAdapterMetadata | null {\n` +
    `  const m = metadata as Partial<InvoiceAdapterMetadata> | undefined;\n` +
    `  if (!m || (m.kind !== 'region' && m.kind !== 'country') || typeof m.code !== 'string') return null;\n` +
    `  return { kind: m.kind, code: m.code.toUpperCase(), label: m.label };\n` +
    `}\n\n` +
    `/**\n` +
    ` * Resolve an adapter by routing kind + code via the invoice:adapter extension\n` +
    ` * registry. Every adapter lives in its own satellite module (invoice_<key>);\n` +
    ` * instances are cached per kind:code (config is read per-call via SettingService,\n` +
    ` * so caching the instance is safe).\n` +
    ` */\n` +
    `async function loadAdapter(kind: InvoiceAdapterMetadata['kind'], code: string): Promise<InvoiceAdapter | null> {\n` +
    `  const wanted = code.toUpperCase();\n` +
    `  const cacheKey = \`\${kind}:\${wanted}\`;\n` +
    `  const cached = instances.get(cacheKey);\n` +
    `  if (cached) return cached;\n\n` +
    `  const contrib = extensionRegistry.getContributions(INVOICE_ADAPTER_POINT).find((c) => {\n` +
    `    const m = adapterMeta(c.metadata);\n` +
    `    return m?.kind === kind && m.code === wanted;\n` +
    `  });\n` +
    `  if (!contrib) return null;\n\n` +
    `  const impl = await extensionRegistry.load<InvoiceAdapterContribution>(contrib);\n` +
    `  const inst = impl.create();\n` +
    `  instances.set(cacheKey, inst);\n` +
    `  return inst;\n` +
    `}\n\n` +
    `/** Resolve the region adapter for a tenant's billing region; null if unknown. */\n` +
    `export async function getInvoiceAdapter(region: string): Promise<InvoiceAdapter | null> {\n` +
    `  return loadAdapter('region', region);\n` +
    `}\n\n` +
    `/** Resolve a country-specific adapter by issuer country code; null if none. */\n` +
    `export async function getCountryInvoiceAdapter(countryCode: string): Promise<InvoiceAdapter | null> {\n` +
    `  if (!countryCode) return null;\n` +
    `  return loadAdapter('country', countryCode);\n` +
    `}\n\n` +
    `/**\n` +
    ` * Pick the adapter for an invoice: the issuer-country regime wins when one\n` +
    ` * exists (e.g. an IT issuer always uses FatturaPA), otherwise fall back to the\n` +
    ` * tenant's region adapter. The issuer country comes from \`companyCountryCode\`.\n` +
    ` */\n` +
    `export async function resolveInvoiceAdapter(tenantId: string, region: string): Promise<InvoiceAdapter | null> {\n` +
    `  const issuerCountry = (await SettingService.getValue(tenantId, 'companyCountryCode')) ?? '';\n` +
    `  return (await getCountryInvoiceAdapter(issuerCountry)) ?? (await getInvoiceAdapter(region));\n` +
    `}\n\n` +
    `export async function listInvoiceAdapters(tenantId: string): Promise<Array<{ region: string; configured: boolean }>> {\n` +
    `  const out: Array<{ region: string; configured: boolean }> = [];\n` +
    `  for (const contrib of extensionRegistry.getContributions(INVOICE_ADAPTER_POINT)) {\n` +
    `    const m = adapterMeta(contrib.metadata);\n` +
    `    if (!m) continue;\n` +
    `    const impl = await extensionRegistry.load<InvoiceAdapterContribution>(contrib);\n` +
    `    out.push({ region: m.code, configured: await impl.create().isConfigured(tenantId) });\n` +
    `  }\n` +
    `  return out;\n` +
    `}\n`,
);
console.log('rewrote invoice adapters/registry (extension-only async)');
