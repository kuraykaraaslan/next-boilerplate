export function parseDbUrl(raw: string): { url: string; schema?: string } {
  const match = raw.match(/[?&]schema=([^&]+)/);
  const schema = match?.[1];
  const url = raw.replace(/[?&]schema=[^&]+/, '').replace(/[?&]$/, '');
  return { url, schema };
}
