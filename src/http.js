import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { request } from './client.js';
import { createServer } from './server.js';

/**
 * Runs the MCP server as a Streamable HTTP endpoint on /mcp.
 *
 * @param {{ host: string, port: number }} options
 */
export async function runHttp({ host, port }) {
  const app = createMcpExpressApp({ host });

  async function handleRequest(req, res, body) {
    const server = createServer(request);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  }

  app.post('/mcp', (req, res) => handleRequest(req, res, req.body));
  app.get('/mcp', (req, res) => handleRequest(req, res));
  app.delete('/mcp', (req, res) => handleRequest(req, res));

  app.listen(port, host, () => {
    console.log(`organizze-mcp listening on http://${host}:${port}/mcp`);
  });
}
