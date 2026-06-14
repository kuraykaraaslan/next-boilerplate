import type { ExportFormat } from './entities/tenant_export_job.entity';

function xmlEscape(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function csvCell(v: unknown): string {
  if (v == null) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Serialize a parsed export object (collections + metadata) into the requested
 * format. JSON/NDJSON/XML/CSV are all single-file, streamable representations
 * of the same data — real output an IdP / data team can consume directly.
 */
export function serializeExport(data: Record<string, unknown>, format: ExportFormat): { buffer: Buffer; contentType: string; ext: string } {
  if (format === 'JSON') {
    return { buffer: Buffer.from(JSON.stringify(data, null, 2), 'utf-8'), contentType: 'application/json', ext: 'json' };
  }

  if (format === 'NDJSON') {
    const lines: string[] = [];
    for (const [collection, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        for (const row of value) lines.push(JSON.stringify({ _collection: collection, ...(row as object) }));
      } else {
        lines.push(JSON.stringify({ _meta: collection, value }));
      }
    }
    return { buffer: Buffer.from(lines.join('\n') + '\n', 'utf-8'), contentType: 'application/x-ndjson', ext: 'ndjson' };
  }

  if (format === 'CSV') {
    const parts: string[] = [];
    for (const [collection, value] of Object.entries(data)) {
      if (!Array.isArray(value) || value.length === 0) continue;
      const cols = Array.from(value.reduce((set: Set<string>, row) => {
        Object.keys(row as object).forEach((k) => set.add(k));
        return set;
      }, new Set<string>()));
      parts.push(`# ${collection}`);
      parts.push(cols.map(csvCell).join(','));
      for (const row of value) parts.push(cols.map((c) => csvCell((row as Record<string, unknown>)[c])).join(','));
      parts.push('');
    }
    return { buffer: Buffer.from(parts.join('\n'), 'utf-8'), contentType: 'text/csv', ext: 'csv' };
  }

  // XML
  const chunks: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<export>'];
  for (const [collection, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      chunks.push(`  <collection name="${xmlEscape(collection)}">`);
      for (const row of value) {
        chunks.push('    <row>');
        for (const [k, v] of Object.entries(row as object)) {
          chunks.push(`      <${k}>${xmlEscape(typeof v === 'object' ? JSON.stringify(v) : v)}</${k}>`);
        }
        chunks.push('    </row>');
      }
      chunks.push('  </collection>');
    } else {
      chunks.push(`  <meta name="${xmlEscape(collection)}">${xmlEscape(value)}</meta>`);
    }
  }
  chunks.push('</export>');
  return { buffer: Buffer.from(chunks.join('\n'), 'utf-8'), contentType: 'application/xml', ext: 'xml' };
}
