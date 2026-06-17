#!/usr/bin/env node
// Scaffolds a *module* as a node in the contribution graph. There is no special
// "satellite" class — every module is an equal citizen that may, in any
// combination:
//
//   • contribute an implementation into another module's extension point  (a "plug")
//       → module.json `extensions[]`     → server/<key>.<impl>.ts + server/<key>.extension.ts
//   • declare its own extension points for others to plug into            (a "socket")
//       → module.json `extensionPoints[]`→ server/<local>.types.ts + server/<local>.registry.ts
//   • do BOTH → it is a chain link (A → B → C). The snapshot validator rejects
//       any dependency or chain *cycle*.
//
// A module may plug into several different hosts at once (e.g. one `tax_engine`
// contributing into both `payment:*` and `invoice:*`), so module ids are NOT
// required to carry a `<host>_` prefix — name freely after the module's purpose.
//
// Usage:
//   node scripts/new-module.mjs <id> [flags]
//
//   <id>   module id  (^[a-z][a-z0-9_]*$), e.g. payment_adyen, tax_engine
//
// Plugs (repeatable):
//   --contributes <host:point>[:key]   target an existing point; key defaults to <id>
//                                       e.g. --contributes payment:gateway:adyen
//
// Sockets (repeatable):
//   --declares <id:local>=<kind>       declare a new point; kind = provider | hook
//                                       e.g. --declares tax:calculator=provider
//
// Misc:
//   --requires a,b,c   extra module deps  (hosts you contribute to + common are auto-added)
//   --name "..."  --icon fa-...  --label "..."  --meta k=v (repeatable)
//   --priority N  --tags a,b  --force  --no-snapshot
//
// Examples:
//   node scripts/new-module.mjs payment_adyen --contributes payment:gateway:adyen \
//        --contributes payment:coupon:adyen --label "Adyen"
//   node scripts/new-module.mjs tax_engine --declares tax:calculator=provider \
//        --contributes payment:tax:engine --contributes invoice:tax=engine

import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES_DIR = path.join(REPO_ROOT, 'modules');
const ID_RE = /^[a-z][a-z0-9_]*$/;
const POINT_RE = /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/;

function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  const repeat = new Set(['contributes', 'declares', 'meta']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (key === 'force' || key === 'no-snapshot') { flags[key] = true; continue; }
      const val = argv[++i];
      if (repeat.has(key)) (flags[key] ??= []).push(val);
      else flags[key] = val;
    } else positionals.push(a);
  }
  return { positionals, flags };
}

const die = (m) => { console.error(`\n✖ ${m}\n`); process.exit(1); };
const exists = (p) => access(p).then(() => true, () => false);
const pascal = (s) => s.split(/[_-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
const titleCase = (s) => s.split(/[_-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

// Resolve which module actually *declares* a given extension point. Point ids do
// NOT have to be prefixed with their owner's module id (free naming), so scan
// every manifest rather than assuming `owner === point.split(':')[0]`.
async function findPointOwner(point) {
  for (const e of await readdir(MODULES_DIR, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const mf = path.join(MODULES_DIR, e.name, 'module.json');
    if (!(await exists(mf))) continue;
    const manifest = JSON.parse(await readFile(mf, 'utf8'));
    if ((manifest.extensionPoints ?? []).some((p) => p.id === point)) return { hostId: manifest.id, hostManifest: manifest };
  }
  return null;
}

async function walk(dir, filter) {
  if (!(await exists(dir))) return [];
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p, filter)));
    else if (filter(p)) out.push(p);
  }
  return out;
}

// Discover a host's contribution interface + its base contract, so the plug stub
// compiles against the real types. Any field may be null → falls back to a TODO.
async function discoverContract(hostId, point) {
  const hostServer = path.join(MODULES_DIR, hostId, 'server');
  const localName = point.split(':')[1];
  const files = await walk(hostServer, (f) => f.endsWith('.types.ts'));
  const candidates = [];
  for (const file of files) {
    const src = await readFile(file, 'utf8');
    const m = src.match(/export\s+interface\s+(\w*Contribution)\b/);
    if (m) candidates.push({ file, src, typeName: m[1] });
  }
  if (!candidates.length) return {};
  const pick =
    candidates.find((c) => c.file.toLowerCase().includes(localName)) ||
    candidates.find((c) => c.typeName.toLowerCase().includes(localName)) ||
    candidates[0];
  const rel = path.relative(hostServer, pick.file).replace(/\.ts$/, '').split(path.sep).join('/');
  return {
    typeName: pick.typeName,
    importPath: `@kuraykaraaslan/${hostId}/server/${rel}`,
    base: await discoverBase(pick.src, pick.file, hostServer, hostId),
  };
}

async function discoverBase(typesSrc, typesFile, hostServer, hostId) {
  const createM = typesSrc.match(/create\s*\([^)]*\)\s*:\s*([A-Za-z_]\w*)/);
  if (!createM) return null;
  const baseName = createM[1];
  const im = typesSrc.match(
    new RegExp(`import\\s+(?:type\\s+)?(?:(${baseName})|\\{[^}]*\\b${baseName}\\b[^}]*\\})\\s+from\\s+['"]([^'"]+)['"]`),
  );
  if (!im) return { name: baseName, importPath: null, kind: null };
  const isDefaultImport = Boolean(im[1]);
  const spec = im[2];
  let importPath, baseFileAbs;
  if (spec.startsWith('@kuraykaraaslan/')) {
    importPath = spec;
    baseFileAbs = path.join(MODULES_DIR, spec.slice('@kuraykaraaslan/'.length) + '.ts');
  } else {
    const absNoExt = path.resolve(path.dirname(typesFile), spec);
    importPath = `@kuraykaraaslan/${hostId}/server/${path.relative(hostServer, absNoExt).split(path.sep).join('/')}`;
    baseFileAbs = absNoExt + '.ts';
  }
  let kind = null;
  if (await exists(baseFileAbs)) {
    const bsrc = await readFile(baseFileAbs, 'utf8');
    if (new RegExp(`class\\s+${baseName}\\b`).test(bsrc)) kind = 'class';
    else if (new RegExp(`interface\\s+${baseName}\\b`).test(bsrc)) kind = 'interface';
  }
  return { name: baseName, importPath, kind, isDefaultImport };
}

function renderImpl(base, ClassName, name, point) {
  if (base?.importPath && base.kind === 'class') {
    const imp = base.isDefaultImport ? `import ${base.name} from '${base.importPath}';` : `import { ${base.name} } from '${base.importPath}';`;
    return `${imp}\n\n/** ${name} — implementation behind \`${point}\`. */\nexport default class ${ClassName} extends ${base.name} {\n  // TODO: implement the methods required by ${base.name}.\n}\n`;
  }
  if (base?.importPath && base.kind === 'interface') {
    return `import type { ${base.name} } from '${base.importPath}';\n\n/** ${name} — implementation behind \`${point}\`. */\nexport default class ${ClassName} implements ${base.name} {\n  // TODO: implement every member of ${base.name}.\n}\n`;
  }
  return `/**\n * ${name} — implementation behind \`${point}\`.\n * TODO: extend/implement the host's base contract (see its *.types.ts create() return type).\n */\nexport default class ${ClassName} {\n}\n`;
}

async function main() {
  const { positionals, flags } = parseArgs(process.argv.slice(2));
  const [id] = positionals;
  if (!id) die('usage: node scripts/new-module.mjs <id> [--contributes h:p[:key]] [--declares id:local=kind] [flags]');
  if (!ID_RE.test(id)) die(`invalid id '${id}' — must match ${ID_RE}`);

  const contribSpecs = flags.contributes ?? [];
  const declareSpecs = flags.declares ?? [];
  if (!contribSpecs.length && !declareSpecs.length) die('a module must do something: pass at least one --contributes or --declares');

  const targetDir = path.join(MODULES_DIR, id);
  if ((await exists(targetDir)) && !flags.force) die(`modules/${id} already exists — pass --force to overwrite`);

  // ── parse + validate plugs ──
  const plugs = [];
  for (const spec of contribSpecs) {
    const parts = spec.split(':');
    if (parts.length < 2) die(`bad --contributes '${spec}' — expected <pointPrefix>:<point>[:key]`);
    const point = `${parts[0]}:${parts[1]}`;
    const key = parts[2] || id;
    const owner = await findPointOwner(point);
    if (!owner) die(`--contributes '${spec}': no module declares extension point '${point}'`);
    const { hostId, hostManifest } = owner;
    const local = parts[1];
    const impl = local === 'adapter' ? { dir: 'adapters', suffix: 'adapter' } : { dir: 'providers', suffix: 'provider' };
    const contract = await discoverContract(hostId, point);
    plugs.push({ point, key, hostId, hostManifest, impl, contract, ClassName: pascal(key) + pascal(impl.suffix) });
  }

  // ── parse + validate sockets ──
  const sockets = [];
  for (const spec of declareSpecs) {
    const [pid, kind] = spec.split('=');
    if (!POINT_RE.test(pid)) die(`bad --declares '${spec}' — point id '${pid}' must match ${POINT_RE}`);
    if (!['provider', 'hook'].includes(kind)) die(`bad --declares '${spec}' — kind must be 'provider' or 'hook'`);
    const local = pid.split(':')[1];
    sockets.push({ pid, kind, local, Iface: pascal(local) + 'Contribution', Base: pascal(local) + (kind === 'hook' ? 'Hook' : 'Provider') });
  }

  // ── manifest fields ──
  const primaryHost = plugs[0]?.hostManifest;
  const name = flags.name || titleCase(id);
  const label = flags.label || name;
  const icon = flags.icon || primaryHost?.icon || 'fas fa-puzzle-piece';
  const priority = Number(flags.priority ?? (primaryHost?.priority ?? 100) + 1);
  const hostIds = [...new Set(plugs.map((p) => p.hostId))];
  const requires = [...new Set([...hostIds, ...(flags.requires?.split(',').map((s) => s.trim()).filter(Boolean) ?? []), 'common'])];
  const tags = [...new Set([...(primaryHost?.tags ?? []), ...plugs.map((p) => p.point.split(':')[1]), ...(flags.tags?.split(',').map((s) => s.trim()).filter(Boolean) ?? [])])];
  const metadata = { label };
  for (const kv of flags.meta ?? []) { const [k, ...r] = kv.split('='); metadata[k] = r.join('='); }

  // ── assemble module.json ──
  const moduleJson = {
    $schema: '../module.schema.json',
    id,
    name,
    description: flags.name ? name : `${name} module.`,
    version: '1.0.0',
    icon,
    tags,
    priority,
    dependencies: { requires },
    author: primaryHost?.author ?? 'Kuray Karaaslan',
    homepage: `https://github.com/kuraykaraaslan/next-boilerplate/tree/main/modules/${id}`,
    license: primaryHost?.license ?? 'CC-BY-NC-ND-4.0',
  };
  if (sockets.length) moduleJson.extensionPoints = sockets.map((s) => ({ id: s.pid, kind: s.kind, description: `${name} ${s.local} extension point.` }));
  if (plugs.length) moduleJson.extensions = plugs.map((p) => ({ point: p.point, key: p.key, export: `${id}/server/${p.key}.extension`, metadata }));

  // ── package.json exports (snapshot validates every contributed export key) ──
  const exportsMap = { './module.json': './module.json' };
  for (const p of plugs) {
    exportsMap[`./server/${p.impl.dir}/${p.key}.${p.impl.suffix}`] = `./server/${p.impl.dir}/${p.key}.${p.impl.suffix}.ts`;
    exportsMap[`./server/${p.key}.extension`] = `./server/${p.key}.extension.ts`;
  }
  for (const s of sockets) {
    exportsMap[`./server/${s.local}.types`] = `./server/${s.local}.types.ts`;
    exportsMap[`./server/${s.local}.registry`] = `./server/${s.local}.registry.ts`;
  }
  const packageJson = { name: `@kuraykaraaslan/${id}`, version: '0.0.0', private: true, type: 'module', exports: exportsMap };

  // ── write files ──
  await mkdir(path.join(targetDir, 'server'), { recursive: true });
  await writeFile(path.join(targetDir, 'module.json'), JSON.stringify(moduleJson, null, 2) + '\n');
  await writeFile(path.join(targetDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');

  const written = ['module.json', 'package.json'];
  for (const p of plugs) {
    await mkdir(path.join(targetDir, 'server', p.impl.dir), { recursive: true });
    const tImport = p.contract.typeName
      ? `import type { ${p.contract.typeName} } from '${p.contract.importPath}';\n`
      : `// TODO: import the host contribution type from '@kuraykaraaslan/${p.hostId}/server/...'\n`;
    const tAnnot = p.contract.typeName ? `: ${p.contract.typeName}` : '';
    const ext = `${tImport}import ${p.ClassName} from './${p.impl.dir}/${p.key}.${p.impl.suffix}';\n\n` +
      `/**\n * ${name} contribution for the \`${p.point}\` extension point. The host (${p.hostId})\n` +
      ` * discovers this via the extension registry and never imports ${p.ClassName} directly.\n */\n` +
      `const contribution${tAnnot} = {\n  key: '${p.key}',\n  create: () => new ${p.ClassName}(),\n};\n\nexport default contribution;\n`;
    await writeFile(path.join(targetDir, 'server', `${p.key}.extension.ts`), ext);
    await writeFile(path.join(targetDir, 'server', p.impl.dir, `${p.key}.${p.impl.suffix}.ts`), renderImpl(p.contract.base, p.ClassName, name, p.point));
    written.push(`server/${p.key}.extension.ts`, `server/${p.impl.dir}/${p.key}.${p.impl.suffix}.ts`);
  }

  for (const s of sockets) {
    const typesTs =
`/**
 * Contract for the \`${s.pid}\` extension point owned by ${id}. A contributing
 * module default-exports a ${s.Iface}; ${id} discovers it via the extension
 * registry (see ./${s.local}.registry) and never imports the implementation directly.
 */
export interface ${s.Base} {
  // TODO: define the members every ${s.local} implementation must provide.
}

export interface ${s.Iface} {
  /** Stable contribution key; must equal the manifest contribution key. */
  readonly key: string;
  /** Instantiate the ${s.local} implementation. */
  create(): ${s.Base};
}
`;
    const registryTs =
`import { extensionRegistry } from '@kuraykaraaslan/common/server/extension-registry';
import type { ${s.Iface} } from './${s.local}.types';

/** Target extension point owned by ${id}. */
export const ${s.local.toUpperCase()}_POINT = '${s.pid}';

/**
 * Resolve every contribution plugged into \`${s.pid}\`, gated by the caller's
 * enabled-module set. Pass \`{ enabledIds: await getEnabledModuleIds(tenantId) }\`
 * for per-tenant gating. Loads implementations lazily — no satellite is imported
 * until its contribution is actually used.
 */
export async function load${pascal(s.local)}Contributions(filter = {}): Promise<${s.Iface}[]> {
  const contribs = extensionRegistry.getContributions(${s.local.toUpperCase()}_POINT, filter);
  return Promise.all(contribs.map((c) => extensionRegistry.load<${s.Iface}>(c)));
}
`;
    await writeFile(path.join(targetDir, 'server', `${s.local}.types.ts`), typesTs);
    await writeFile(path.join(targetDir, 'server', `${s.local}.registry.ts`), registryTs);
    written.push(`server/${s.local}.types.ts`, `server/${s.local}.registry.ts`);
  }

  console.log(`\n✔ scaffolded modules/${id}  (node: ${plugs.length} plug(s), ${sockets.length} socket(s)${plugs.length && sockets.length ? ' → chain link' : ''})`);
  for (const f of written) console.log(`  • ${f}`);
  for (const p of plugs) console.log(`  ↳ plug   ${p.point}  key '${p.key}'  (${p.ClassName}${p.contract.base ? ` ${p.contract.base.kind === 'interface' ? 'implements' : 'extends'} ${p.contract.base.name}` : ''})`);
  for (const s of sockets) console.log(`  ↳ socket ${s.pid}  (${s.kind})`);

  if (flags['no-snapshot']) {
    console.log(`\n→ skipped snapshot. Run \`npm run registry:snapshot\` to register.`);
  } else {
    console.log(`\n→ running \`npm run registry:snapshot\` …`);
    const r = spawnSync('npm', ['run', 'registry:snapshot'], { cwd: REPO_ROOT, stdio: 'inherit' });
    if (r.status !== 0) die('snapshot failed — fix the reported error and re-run `npm run registry:snapshot`');
  }
  console.log(`\nNext: fill in the TODOs in modules/${id}/server/.\n`);
}

main().catch((e) => die(e.stack || String(e)));
