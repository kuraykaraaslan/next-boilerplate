// TypeORM entity inventory — parses modules/<id>/entities/*.entity.ts via regex.

import path from 'node:path';
import { MODULES_DIR, walk, rel, readText } from './fs-utils.mjs';

function parseEntity(source, fallbackName) {
  const classM = source.match(/@Entity\s*\(([^)]*)\)\s*export\s+class\s+(\w+)/)
              ?? source.match(/export\s+class\s+(\w+)/);
  let name = fallbackName;
  let tableName;
  let schema = 'unknown';
  const ent = source.match(/@Entity\s*\(\s*(?:\{([^}]*)\}|['"]([^'"]+)['"])/);
  if (ent) {
    if (ent[2]) tableName = ent[2];
    if (ent[1]) {
      const nameM = ent[1].match(/name\s*:\s*['"]([^'"]+)['"]/);
      if (nameM) tableName = nameM[1];
      const schemaM = ent[1].match(/schema\s*:\s*['"]([^'"]+)['"]/);
      if (schemaM) schema = schemaM[1];
    }
  }
  if (classM) name = classM[classM.length - 1];

  const columns = [];
  const colRe = /@(?:Column|PrimaryGeneratedColumn|PrimaryColumn|CreateDateColumn|UpdateDateColumn|DeleteDateColumn|VersionColumn)\b[\s\S]*?\n\s*([a-zA-Z_$][\w$]*)\s*[!?:]/g;
  let m;
  while ((m = colRe.exec(source)) !== null) columns.push(m[1]);

  const relations = [];
  const relRe = /@(?:ManyToOne|OneToMany|OneToOne|ManyToMany|JoinColumn|JoinTable)\b[\s\S]*?\n\s*([a-zA-Z_$][\w$]*)\s*[!?:]/g;
  while ((m = relRe.exec(source)) !== null) relations.push(m[1]);

  return { name, tableName, schema, columns: [...new Set(columns)], relations: [...new Set(relations)] };
}

export async function collectEntities() {
  const files = await walk(MODULES_DIR, (full) => /\/entities\/[^/]+\.entity\.ts$/.test(full));
  const entities = [];
  for (const file of files) {
    const src = (await readText(file)) ?? '';
    const fallback = path.basename(file).replace(/\.entity\.ts$/, '');
    const parsed = parseEntity(src, fallback);
    const moduleId = rel(file).split('/')[1];
    let schema = parsed.schema;
    if (schema === 'unknown') {
      schema = (moduleId.startsWith('tenant') || moduleId === 'audit_log' || moduleId === 'api_key' || moduleId === 'webhook')
        ? 'tenant'
        : 'system';
    }
    entities.push({
      name: parsed.name,
      filePath: rel(file),
      module: moduleId,
      schema,
      tableName: parsed.tableName,
      columns: parsed.columns,
      relations: parsed.relations,
    });
  }
  entities.sort((a, b) => a.name.localeCompare(b.name));
  return entities;
}
