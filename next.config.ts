import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["typeorm", "reflect-metadata", "pg"],
  // Turbopack has issues with TypeORM decorators, use webpack instead
  // Run: npm run dev -- --turbopack=false
  // Or simply: next dev (without --turbo)
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
        hostname: 'www.gravatar.com'
      },
      {
        protocol: 'https',
        hostname: '*.core.windows.net'
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com'
      },
      {
        protocol: 'https',
        hostname: 'kuray.dev'
      },
      {
        protocol: 'https',
        hostname: 'www.kuray.dev'
      }
    ]
  }
};

export default nextConfig;
