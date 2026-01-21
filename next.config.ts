import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["typeorm", "reflect-metadata", "pg"],
  // Turbopack has issues with TypeORM decorators, use webpack instead
  // Run: npm run dev -- --turbopack=false
  // Or simply: next dev (without --turbo)
};

export default nextConfig;
