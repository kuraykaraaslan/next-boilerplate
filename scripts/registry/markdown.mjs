// Per-module markdown chunk rendering (public/modules/<id>.md).

export function markdownForModule(mod, related) {
  const lines = [];
  lines.push(`# ${mod.name}`);
  lines.push('');
  lines.push(`- **id:** \`${mod.id}\``);
  lines.push(`- **tier:** ${mod.tier}`);
  lines.push(`- **version:** ${mod.version}`);
  lines.push(`- **dir:** \`${mod.dir}/\``);
  if (mod.tags?.length) lines.push(`- **tags:** ${mod.tags.join(', ')}`);
  if (mod.icon) lines.push(`- **icon:** \`${mod.icon}\``);
  lines.push(`- **hasNextLayer:** ${mod.hasNextLayer}`);
  lines.push('');
  if (mod.description) { lines.push(mod.description); lines.push(''); }

  const deps = mod.dependencies ?? {};
  if (deps.requires?.length || deps.optional?.length || deps.conflicts?.length) {
    lines.push('## Dependencies', '');
    if (deps.requires?.length)  lines.push(`- **requires:** ${deps.requires.map((d) => `\`${d}\``).join(', ')}`);
    if (deps.optional?.length)  lines.push(`- **optional:** ${deps.optional.map((d) => `\`${d}\``).join(', ')}`);
    if (deps.conflicts?.length) lines.push(`- **conflicts:** ${deps.conflicts.map((d) => `\`${d}\``).join(', ')}`);
    lines.push('');
  }

  const ex = mod.exports ?? {};
  const buckets = [
    ['Services',     ex.services],
    ['DTOs',         ex.dtos],
    ['Entities',     ex.entities],
    ['Enums',        ex.enums],
    ['Message keys', ex.messageKeys],
    ['Setting keys', ex.settingKeys],
    ['Providers',    ex.providers],
    ['Jobs',         ex.jobs],
  ];
  for (const [label, items] of buckets) {
    if (items?.length) {
      lines.push(`## ${label}`, '');
      for (const item of items) lines.push(`- \`${item}\``);
      lines.push('');
    }
  }

  if (related.routes.length) {
    lines.push('## Owned API routes', '');
    for (const r of related.routes) lines.push(`- \`${r.scope}\` ${r.methods.join('/')} \`${r.urlPath}\``);
    lines.push('');
  }
  if (related.entities.length) {
    lines.push('## TypeORM entities', '');
    for (const e of related.entities) lines.push(`- \`${e.name}\` (${e.schema}) — \`${e.filePath}\``);
    lines.push('');
  }
  if (related.components.length) {
    lines.push('## Next layer (modules_next/) surface', '');
    for (const c of related.components.slice(0, 60)) {
      const tags = [c.kind, c.isClient ? 'client' : null, c.isServer ? 'server' : null].filter(Boolean).join(', ');
      lines.push(`- \`${c.id}\` _(${tags})_`);
    }
    if (related.components.length > 60) lines.push(`- … and ${related.components.length - 60} more`);
    lines.push('');
  }

  if (mod.readme) {
    lines.push('## README', '', mod.readme.trim(), '');
  }

  return lines.join('\n');
}
