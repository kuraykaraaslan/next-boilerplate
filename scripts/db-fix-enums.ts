import 'reflect-metadata';
import 'dotenv/config';
import { Client } from 'pg';
import { env } from '@/modules/env';
import { parseDbUrl } from '@/modules/db/db.utils';

type EnumDependency = {
  enumName: string;
  schema: string;
  tableSchema: string | null;
  tableName: string | null;
  columnName: string | null;
  isArray: boolean | null;
};

async function listEnumDependencies(client: Client, schema: string): Promise<EnumDependency[]> {
  // Find every column whose declared type is either an enum in this schema
  // OR an array of such an enum (e.g. enum_type[]). Each enum has an implicit
  // array companion in pg_type where typelem points back to the enum's oid.
  const { rows } = await client.query<EnumDependency>(
    `
    WITH target_enums AS (
      SELECT t.oid, t.typname, n.nspname AS schema
      FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typtype = 'e' AND n.nspname = $1
    )
    SELECT
      te.typname                                  AS "enumName",
      te.schema                                   AS "schema",
      cls_ns.nspname                              AS "tableSchema",
      cls.relname                                 AS "tableName",
      att.attname                                 AS "columnName",
      (att.atttypid <> te.oid)                    AS "isArray"
    FROM target_enums te
      LEFT JOIN pg_attribute att ON (
        att.atttypid = te.oid
        OR att.atttypid IN (SELECT oid FROM pg_type WHERE typelem = te.oid)
      )
      LEFT JOIN pg_class cls          ON cls.oid = att.attrelid
      LEFT JOIN pg_namespace cls_ns   ON cls_ns.oid = cls.relnamespace
    WHERE att.attnum IS NULL OR (
      att.attnum > 0
      AND NOT att.attisdropped
      AND cls.relkind IN ('r', 'p')
    )
    `,
    [schema],
  );
  return rows;
}

async function fixSchema(databaseUrl: string, label: string) {
  const { url, schema } = parseDbUrl(databaseUrl);
  if (!schema) {
    console.log(`[${label}] No schema specified in DATABASE_URL, skipping.`);
    return;
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const deps = await listEnumDependencies(client, schema);

    if (deps.length === 0) {
      console.log(`[${label}/${schema}] No enum types found. Nothing to do.`);
      return;
    }

    const enumNames = new Set<string>();
    const columns: Array<{ tableSchema: string; tableName: string; columnName: string; isArray: boolean }> = [];

    for (const d of deps) {
      if (d.enumName) enumNames.add(d.enumName);
      if (d.tableSchema && d.tableName && d.columnName) {
        columns.push({
          tableSchema: d.tableSchema,
          tableName:   d.tableName,
          columnName:  d.columnName,
          isArray:     d.isArray === true,
        });
      }
    }

    console.log(`[${label}/${schema}] Found ${enumNames.size} enum type(s): ${[...enumNames].join(', ')}`);
    console.log(`[${label}/${schema}] Affecting ${columns.length} column(s).`);

    await client.query('BEGIN');
    try {
      for (const col of columns) {
        const qualifiedTable = `"${col.tableSchema}"."${col.tableName}"`;
        const dropDefaultSql = `ALTER TABLE ${qualifiedTable} ALTER COLUMN "${col.columnName}" DROP DEFAULT`;
        console.log(`  ${dropDefaultSql}`);
        await client.query(dropDefaultSql);

        const targetType = col.isArray ? 'varchar[]' : 'varchar';
        const usingExpr  = col.isArray
          ? `"${col.columnName}"::text[]`
          : `"${col.columnName}"::text`;
        const alterSql = `ALTER TABLE ${qualifiedTable} ALTER COLUMN "${col.columnName}" TYPE ${targetType} USING ${usingExpr}`;
        console.log(`  ${alterSql}`);
        await client.query(alterSql);
      }

      for (const enumName of enumNames) {
        const sql = `DROP TYPE IF EXISTS "${schema}"."${enumName}"`;
        console.log(`  ${sql}`);
        await client.query(sql);
      }

      await client.query('COMMIT');
      console.log(`[${label}/${schema}] Done.`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    await client.end();
  }
}

async function main() {
  await fixSchema(env.DATABASE_URL, 'db');
  console.log('All enum types converted to varchar. Next `npm run dev` should sync cleanly.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
