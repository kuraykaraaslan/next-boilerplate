// JSON-RPC 2.0 method dispatch for the MCP server (framing handled by the caller).

import { TOOLS } from './tools.mjs';
import { callTool } from './handlers.mjs';

const SERVER_INFO = { name: 'next-boilerplate-registry', version: '1.0.0' };
const PROTOCOL_VERSION = '2024-11-05';

export async function handle(message) {
  if (!message || typeof message !== 'object') return null;
  const { id, method, params } = message;
  try {
    switch (method) {
      case 'initialize':
        return reply(id, {
          protocolVersion: PROTOCOL_VERSION,
          serverInfo: SERVER_INFO,
          capabilities: { tools: {} },
        });
      case 'tools/list': return reply(id, { tools: TOOLS });
      case 'tools/call': {
        const result = await callTool(params?.name, params?.arguments || {});
        return reply(id, result);
      }
      case 'ping': return reply(id, {});
      case 'notifications/initialized':
      case 'initialized':
        return null;
      default:
        if (id !== undefined) return reply(id, null, { code: -32601, message: `Method not found: ${method}` });
        return null;
    }
  } catch (err) {
    if (id !== undefined) return reply(id, null, { code: -32000, message: err?.message || String(err) });
    return null;
  }
}

function reply(id, result, error) {
  const payload = { jsonrpc: '2.0', id };
  if (error) payload.error = error;
  else payload.result = result;
  return payload;
}
