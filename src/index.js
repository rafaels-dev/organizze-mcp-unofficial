#!/usr/bin/env node

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { request } from './client.js';
import { createServer } from './server.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '127.0.0.1';

const app = createMcpExpressApp({ host: HOST });

async function handleRequest(req, res, body) {
  const server = createServer(request);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

app.post('/mcp', (req, res) => handleRequest(req, res, req.body));
app.get('/mcp', (req, res) => handleRequest(req, res));
app.delete('/mcp', (req, res) => handleRequest(req, res));

app.listen(PORT, HOST, () => {
  console.log(`organizze-mcp listening on http://${HOST}:${PORT}/mcp`);
});
