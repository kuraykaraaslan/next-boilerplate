// Extract the remaining in-tree SSO providers into satellite modules
// (auth_sso_<key>) contributing to the auth_sso:provider extension point, then
// rewrite providers/index.ts to resolve purely via the extension registry.
import fs from 'node:fs';
import path from 'node:path';

const HOST = 'modules/auth_sso/server/providers';
const P = {
  github: { cls: 'GithubProvider', label: 'GitHub', icon: 'fab fa-github' },
  microsoft: { cls: 'MicrosoftProvider', label: 'Microsoft', icon: 'fab fa-microsoft' },
  linkedin: { cls: 'LinkedInProvider', label: 'LinkedIn', icon: 'fab fa-linkedin' },
  apple: { cls: 'AppleProvider', label: 'Apple', icon: 'fab fa-apple', extra: ['apple.jwks.ts'] },
  facebook: { cls: 'FacebookProvider', label: 'Facebook', icon: 'fab fa-facebook' },
  twitter: { cls: 'TwitterProvider', label: 'X (Twitter)', icon: 'fab fa-x-twitter' },
  tiktok: { cls: 'TikTokProvider', label: 'TikTok', icon: 'fab fa-tiktok' },
  slack: { cls: 'SlackProvider', label: 'Slack', icon: 'fab fa-slack' },
  wechat: { cls: 'WeChatProvider', label: 'WeChat', icon: 'fab fa-weixin' },
  autodesk: { cls: 'AutodeskProvider', label: 'Autodesk', icon: 'fas fa-cube' },
  yandex: { cls: 'YandexProvider', label: 'Yandex', icon: 'fab fa-yandex' },
  vk: { cls: 'VkProvider', label: 'VK', icon: 'fab fa-vk' },
  qq: { cls: 'QQProvider', label: 'QQ', icon: 'fab fa-qq' },
  weibo: { cls: 'WeiboProvider', label: 'Weibo', icon: 'fab fa-weibo' },
  alipay: { cls: 'AlipayProvider', label: 'Alipay', icon: 'fab fa-alipay' },
};

function fixImports(src) {
  return src
    .replace(/from '\.\/base\.provider'/g, "from '@nb/auth_sso/server/providers/base.provider'")
    .replace(/from '\.\.\//g, "from '@nb/auth_sso/server/"); // ../auth_sso.X -> @nb/auth_sso/server/auth_sso.X
  // ./apple.jwks stays relative (moved alongside)
}

for (const [key, meta] of Object.entries(P)) {
  const mod = `modules/auth_sso_${key}`;
  const sdir = `${mod}/server/providers`;
  fs.mkdirSync(sdir, { recursive: true });

  // move provider (+ any extra helper files) and fix imports
  for (const file of [`${key}.provider.ts`, ...(meta.extra ?? [])]) {
    const from = path.join(HOST, file);
    const to = path.join(sdir, file);
    fs.writeFileSync(to, fixImports(fs.readFileSync(from, 'utf8')));
    fs.rmSync(from);
  }

  // extension contribution
  fs.writeFileSync(
    `${mod}/server/${key}.extension.ts`,
    `import type { SSOProviderContribution } from '@nb/auth_sso/server/auth_sso.provider.types';\n` +
      `import { ${meta.cls} } from './providers/${key}.provider';\n\n` +
      `const contribution: SSOProviderContribution = {\n` +
      `  key: '${key}',\n` +
      `  create: () => new ${meta.cls}(),\n` +
      `};\n\nexport default contribution;\n`,
  );

  // manifest
  fs.writeFileSync(
    `${mod}/module.json`,
    JSON.stringify(
      {
        $schema: '../module.schema.json',
        id: `auth_sso_${key}`,
        name: `${meta.label} SSO`,
        description: `${meta.label} OAuth/OIDC provider, contributed into the auth_sso:provider extension point.`,
        version: '1.0.0',
        icon: meta.icon,
        tags: ['identity', 'auth', 'sso', 'provider'],
        priority: 17,
        dependencies: { requires: ['auth_sso', 'env', 'common'] },
        author: 'Kuray Karaaslan',
        homepage: `https://github.com/kuraykaraaslan/next-boilerplate/tree/main/modules/auth_sso_${key}`,
        license: 'CC-BY-NC-ND-4.0',
        extensions: [
          {
            point: 'auth_sso:provider',
            key,
            export: `auth_sso_${key}/server/${key}.extension`,
            metadata: { label: meta.label },
          },
        ],
      },
      null,
      2,
    ) + '\n',
  );

  // package.json (exports filled by gen-explicit-exports)
  fs.writeFileSync(
    `${mod}/package.json`,
    JSON.stringify({ name: `@nb/auth_sso_${key}`, version: '0.0.0', private: true, type: 'module', exports: {} }, null, 2) + '\n',
  );

  console.log(`extracted ${key} -> ${mod}`);
}

// rewrite host index.ts: pure extension-registry resolution (no in-tree factories)
fs.writeFileSync(
  `${HOST}/index.ts`,
  `import { extensionRegistry } from '@nb/common/server/extension-registry';\n` +
    `import type { SSOProvider } from '../auth_sso.enums';\n` +
    `import type { SSOProviderService } from '../auth_sso.types';\n` +
    `import type { SSOProviderContribution } from '../auth_sso.provider.types';\n\n` +
    `const SSO_PROVIDER_POINT = 'auth_sso:provider';\n` +
    `const providerInstances: Partial<Record<SSOProvider, SSOProviderService>> = {};\n\n` +
    `/**\n` +
    ` * Resolve the SSO provider implementation for a key. Every provider lives in\n` +
    ` * its own satellite module (auth_sso_<key>) and is discovered via the\n` +
    ` * auth_sso:provider extension registry; instances are cached per key.\n` +
    ` */\n` +
    `export async function getProvider(provider: SSOProvider): Promise<SSOProviderService> {\n` +
    `  const cached = providerInstances[provider];\n` +
    `  if (cached) return cached;\n\n` +
    `  const contrib = extensionRegistry\n` +
    `    .getContributions(SSO_PROVIDER_POINT)\n` +
    `    .find((c) => c.key === provider);\n` +
    `  if (!contrib) throw new Error(\`Unknown SSO provider: \${provider}\`);\n\n` +
    `  const impl = await extensionRegistry.load<SSOProviderContribution>(contrib);\n` +
    `  const instance = impl.create();\n` +
    `  providerInstances[provider] = instance;\n` +
    `  return instance;\n` +
    `}\n`,
);
console.log('rewrote host providers/index.ts (extension-only)');
