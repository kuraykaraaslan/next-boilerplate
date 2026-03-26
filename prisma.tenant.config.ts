import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/tenant/schema/",
  migrations: {
    path: "prisma/tenant/migrations",
    seed: "tsx prisma/tenant/seed.ts",
  },
  datasource: {
    url: process.env.TENANT_DATABASE_URL!,
  },
});
