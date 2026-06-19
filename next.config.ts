import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Each module is an `@kuraykaraaslan/<id>` workspace package shipping raw TS/TSX source
// (no per-package build step). Next must transpile them all. Derive the list
// from every `modules/<id>/package.json` so adding a module needs no config edit.
const modulesDir = path.join(process.cwd(), "modules");
const transpilePackages = fs
  .readdirSync(modulesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(modulesDir, d.name, "package.json"))
  .filter((p) => fs.existsSync(p))
  .map((p) => {
    try {
      return JSON.parse(fs.readFileSync(p, "utf8")).name as string;
    } catch {
      return undefined;
    }
  })
  .filter((name): name is string => Boolean(name));

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  transpilePackages,
  // The demo-reset cron reads `modules/db/migrations/*.sql` from disk at
  // runtime; fs reads aren't traced automatically, so include them explicitly
  // in that route's serverless function bundle.
  outputFileTracingIncludes: {
    "/tenant/[tenantId]/api/[...slug]": ["./modules/db/server/migrations/**/*.sql"],
  },
  // Tree-shake large icon/chart packages so only the symbols actually used
  // land in each route's client bundle (Next rewrites barrel imports to deep
  // paths at build time).
  experimental: {
    optimizePackageImports: [
      "@fortawesome/free-solid-svg-icons",
      "@fortawesome/free-brands-svg-icons",
      "@fortawesome/react-fontawesome",
      "chart.js",
      "react-chartjs-2",
      "react-i18next",
      "countries-list",
      "countries-and-timezones",
    ],
  },
  // ── Edge / CDN caching for the public tenant site ──────────────────────────
  // Public CMS + auth pages are anonymous (rendered from tenantId+slug+lang, no
  // per-user state), so a shared cache can serve them. `s-maxage` lets the CDN
  // hold the HTML; `stale-while-revalidate` serves stale instantly while the
  // edge refetches. Editing a page fires the `page.invalidated` webhook
  // (dynamic_page.crud.service) so edges purge immediately — the long TTL is a
  // ceiling, not the freshness window. `max-age=0` keeps browsers revalidating
  // so a single user never gets stuck on stale HTML.
  // Admin (`/admin/*`) and API (`/api/*`) are explicitly no-store.
  async headers() {
    const PUBLIC_CACHE = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    const PRIVATE = 'private, no-store'
    return [
      // Admin & API first (more specific) — never shared-cache.
      { source: '/tenant/:tenantId/admin', headers: [{ key: 'Cache-Control', value: PRIVATE }] },
      { source: '/tenant/:tenantId/admin/:path*', headers: [{ key: 'Cache-Control', value: PRIVATE }] },
      { source: '/tenant/:tenantId/api/:path*', headers: [{ key: 'Cache-Control', value: PRIVATE }] },
      // Tenant root (home).
      { source: '/tenant/:tenantId', headers: [{ key: 'Cache-Control', value: PUBLIC_CACHE }] },
      // Everything else under the tenant except admin/api.
      {
        source: '/tenant/:tenantId/:path((?!admin(?:$|/)|api(?:$|/)).*)',
        headers: [{ key: 'Cache-Control', value: PUBLIC_CACHE }],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com'
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com'
      },
      {
        protocol: 'https',
        hostname: 'github.com'
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com'
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com'
      },
      {
        protocol: 'https',
        hostname: 's3.*.amazonaws.com'
      },
      {
        protocol: 'https',
        hostname: 'www.gravatar.com'
      },
      {
        protocol: 'https',
        hostname: '*.core.windows.net'
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com'
      }
    ]
  }
};

export default withBundleAnalyzer(nextConfig);
