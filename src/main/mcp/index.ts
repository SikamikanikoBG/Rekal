#!/usr/bin/env node
/**
 * Rekal MCP Server — standalone entry point.
 *
 * Run with:  node dist/main/main/mcp/index.js
 *
 * This opens a read-only SQLite connection to the Rekal database and
 * exposes meeting data over the Model Context Protocol via stdio transport.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';

async function main(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });

  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Rekal MCP server failed to start: ${err}\n`);
  process.exit(1);
});
