import { DataSource } from "typeorm";
import path from "path";
import { fileURLToPath } from "url";

/**
 * ESM-safe __dirname
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Proje root'u (next-boilerplate)
 */
const projectRoot = path.resolve(__dirname, "..", "..", "..");

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "next-boilerplate",

  synchronize: false,
  logging: false,

  entities: [
    path.join(projectRoot, "modules/**/*.entity.{ts,js}"),
  ],

  migrations: [
    path.join(__dirname, "migrations/*.{ts,js}"),
  ],
});
