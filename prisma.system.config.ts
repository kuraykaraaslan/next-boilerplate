import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/system/schema/",
  migrations: {
    path: "prisma/system/migrations",
    seed: "tsx prisma/system/seed.ts",
  },
  datasource: {
    url: process.env.SYSTEM_DATABASE_URL!,
  },
});
