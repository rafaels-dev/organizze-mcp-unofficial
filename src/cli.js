export const USAGE = `organizze-mcp — unofficial MCP server for the Organizze API

Runs as an HTTP server exposing /mcp (Streamable HTTP).

Usage:
  organizze-mcp [options]

Options:
  --host <host>          Host to bind (default: 127.0.0.1).
  -p, --port <port>      Port to bind (default: 3000).
  -h, --help             Show this help.
  -v, --version          Show the version.

Environment variables:
  ORGANIZZE_EMAIL        Organizze account e-mail (required).
  ORGANIZZE_API_TOKEN    Organizze API token (required).
  ORGANIZZE_USER_AGENT   User-Agent sent to the API, e.g. "Your Name (you@example.com)" (required).
  HOST, PORT             Defaults for host and port.

Credentials are also read from a .env file in the current working directory.`;

function parsePort(value, source) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port in ${source}: ${value}`);
  }
  return port;
}

/**
 * Parses command line arguments, falling back to environment variables and defaults.
 *
 * @param {string[]} argv arguments after the node executable and script path
 * @param {Record<string, string | undefined>} env
 * @returns {{ host: string, port: number, help: boolean, version: boolean }}
 */
export function parseArgs(argv = [], env = process.env) {
  let host = null;
  let port = null;
  let help = false;
  let version = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const separator = arg.indexOf('=');
    const flag = arg.startsWith('--') && separator !== -1 ? arg.slice(0, separator) : arg;
    const inlineValue = flag === arg ? undefined : arg.slice(separator + 1);

    const takeValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      const next = argv[++i];
      if (next === undefined) throw new Error(`Missing value for ${flag}`);
      return next;
    };

    switch (flag) {
      case '--host':
        host = takeValue();
        break;
      case '--port':
      case '-p':
        port = parsePort(takeValue(), flag);
        break;
      case '--help':
      case '-h':
        help = true;
        break;
      case '--version':
      case '-v':
        version = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}\n\n${USAGE}`);
    }
  }

  return {
    host: host ?? env.HOST ?? '127.0.0.1',
    port: port ?? (env.PORT ? parsePort(env.PORT, 'PORT') : 3000),
    help,
    version,
  };
}
