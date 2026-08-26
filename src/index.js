#!/usr/bin/env node

import { parseArgs, USAGE } from './cli.js';
import pkg from '../package.json' with { type: 'json' };

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (options.help) {
  console.log(USAGE);
  process.exit(0);
}

if (options.version) {
  console.log(pkg.version);
  process.exit(0);
}

const { missingCredentials } = await import('./client.js');
const missing = missingCredentials();
if (missing.length > 0) {
  console.error(
    `organizze-mcp: missing environment variable(s): ${missing.join(', ')}. Requests to the Organizze API will fail until they are set.`
  );
}

try {
  const { runHttp } = await import('./http.js');
  await runHttp(options);
} catch (error) {
  console.error(`organizze-mcp failed to start: ${error.message}`);
  process.exit(1);
}
