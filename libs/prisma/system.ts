import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/system/client";
import { env } from "@/libs/env";

const connectionString = env.SYSTEM_DATABASE_URL;
const schema = new URL(connectionString).searchParams.get("schema") ?? undefined;
const adapter = new PrismaPg({ connectionString }, { schema });
export const systemPrisma = new PrismaClient({ adapter });
