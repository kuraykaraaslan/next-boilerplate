import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/system/client";

const adapter = new PrismaPg({ connectionString: process.env.SYSTEM_DATABASE_URL! });
export const systemPrisma = new PrismaClient({ adapter });
