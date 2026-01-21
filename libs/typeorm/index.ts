import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "../../");

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: Number(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USERNAME || "postgres",
  password: process.env.DATABASE_PASSWORD || "postgres",
  database: process.env.DATABASE_NAME || "next-boilerplate",
  synchronize: false,
  logging: process.env.NODE_ENV === "development",

  entities: [
    path.join(rootDir, "modules", "**", "*.entity.{ts,js}"),
  ],

  migrations: [
    path.join(rootDir, "migrations", "*.{ts,js}")
  ],
});


export default AppDataSource;
