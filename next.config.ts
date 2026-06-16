import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  output: "standalone",
  // The demo-reset cron reads `modules/db/migrations/*.sql` from disk at
  // runtime; fs reads aren't traced automatically, so include them explicitly
  // in that route's serverless function bundle.
  outputFileTracingIncludes: {
    "/tenant/[tenantId]/api/cron/demo-reset": ["./modules/db/migrations/**/*.sql"],
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
