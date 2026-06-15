#!/usr/bin/env node
// next-boilerplate MCP server (stdio, zero-dep).
//
// Exposes the module / route / entity / component registry to MCP-compatible
// AI clients (Claude Desktop, Cursor, Cline, Windsurf, Zed). Implements
// JSON-RPC 2.0 framed over stdio per the Model Context Protocol spec.
//
// Reads the static snapshot at public/registry/registry.json. Rebuild via
// `npm run registry:snapshot`. The tool schemas, registry loader, tool dispatch
// and JSON-RPC method handling live in scripts/mcp/*.mjs; this file is the
// stdio transport loop.

import { handle } from './mcp/rpc.mjs';

// --- stdio loop (with async-safe shutdown — fix back-ported from kui-ejs).
// Earlier revisions exited as soon as stdin closed, dropping responses that
// were still being awaited; we now track in-flight requests and only exit
// once every queued line has been written.

let buffer = '';
let inflight = 0;
let stdinEnded = false;

function maybeExit() {
  if (stdinEnded && inflight === 0) process.exit(0);
}

async function processLine(line) {
  inflight++;
  try {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    const out = await handle(msg);
    if (out) process.stdout.write(JSON.stringify(out) + '\n');
  } finally {
    inflight--;
    maybeExit();
  }
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (line) void processLine(line);
  }
});
process.stdin.on('end', () => {
  stdinEnded = true;
  if (buffer.trim()) {
    void processLine(buffer.trim());
    buffer = '';
  }
  maybeExit();
});
