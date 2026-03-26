import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/tenant/client";

const adapter = new PrismaPg({ connectionString: process.env.TENANT_DATABASE_URL! });
export const tenantPrisma = new PrismaClient({ adapter });
