# Module contribution graph

There is no special "satellite" module class. **Every module is an equal node in
a contribution graph.** A node may, in any combination:

| Role | Manifest field | Generated files |
| --- | --- | --- |
| **Plug** — contribute an impl into another module's point | `extensions[]` | `server/<key>.extension.ts` + `server/<providers\|adapters>/<key>.<provider\|adapter>.ts` |
| **Socket** — declare its own extension point for others | `extensionPoints[]` | `server/<local>.types.ts` + `server/<local>.registry.ts` |
| **Chain link** — both of the above | both | both |

A module may plug into **several different hosts at once** (e.g. one `tax_engine`
contributing into both `payment:*` and `invoice:*`), so module ids are **not**
required to carry a `<host>_` prefix — name freely after the module's purpose.
The historical `<host>_<variant>` names (`payment_stripe`, `invoice_de_zugferd`,
`auth_acs_tr_edevlet`) are a soft convention for single-host plugs, not a rule.

## How it resolves (build time)

`scripts/registry/module-runtime.mjs` does a two-pass resolve:

1. Collect **all** `extensionPoints` from every module (each point id is owned by
   exactly one module — a duplicate is a hard error).
2. Resolve **all** `extensions`: every contribution's target `point` must be
   declared somewhere, and its `export` must be listed in the contributing
   module's `package.json` `"exports"` (else the generated dynamic import can't
   resolve). Each contribution becomes `<moduleId>:<point>:<key>`.

Because points are collected before contributions are resolved, **load order is
irrelevant** and chains (A → B → C) resolve without topological sorting.

### Graph safety (enforced)

The validator rejects the snapshot (`npm run registry:snapshot` exits non-zero) on:

- **Dependency cycle** in `dependencies.requires` — reported as `a -> b -> a`.
- **Contribution chain cycle** — A plugs into B's point while B plugs into A's —
  reported as `a -> b -> a`.

It **warns** (does not fail) on `requires` pointing at an unregistered module id.

> Pre-existing warning: `tenant_branding` requires `tenant_setting`, which has no
> `module.json`. Fix the dependency (or add the module) to clear it.

## How it resolves (runtime)

A host (socket owner) discovers plugs through the extension registry and **never
imports a contributor directly**:

```ts
import { extensionRegistry } from '@kuraykaraaslan/common/server/extension-registry';

const contribs = extensionRegistry.getContributions('payment:gateway', { enabledIds });
const impl = await extensionRegistry.load<PaymentGatewayContribution>(contribs[0]);
```

Implementations load lazily — a contributor's code is imported only when its
contribution is actually used, and only if its module is enabled for the tenant.

## Scaffolding a module

```bash
# Plug into existing point(s) — key defaults to the module id
npm run new:module -- payment_adyen \
  --contributes payment:gateway:adyen \
  --contributes payment:coupon:adyen \
  --label "Adyen"

# A chain link: declare a socket AND plug into other hosts
npm run new:module -- tax_engine \
  --declares tax:calculator=provider \
  --contributes payment:tax:engine \
  --contributes invoice:tax=engine
```

Flags: `--contributes <prefix:point[:key]>` (repeatable), `--declares <id:local>=<provider|hook>`
(repeatable), `--requires a,b,c`, `--name`, `--icon`, `--label`, `--meta k=v`
(repeatable), `--priority N`, `--tags a,b`, `--force`, `--no-snapshot`.

The generator is **strict**: it refuses to scaffold a plug unless the target
point is actually declared by some module, auto-discovers the host's contribution
interface + base contract so the stub compiles, writes a matching `package.json`
`"exports"` map, then runs the snapshot. Fill in the `// TODO`s afterwards.
