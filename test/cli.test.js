import { describe, it, expect } from 'vitest';
import { parseArgs, USAGE } from '../src/cli.js';

describe('parseArgs()', () => {
  it('defaults to localhost:3000 when nothing is given', () => {
    expect(parseArgs([], {})).toEqual({
      host: '127.0.0.1',
      port: 3000,
      help: false,
      version: false,
    });
  });

  it('parses host and port in both syntaxes', () => {
    expect(parseArgs(['--host', '0.0.0.0', '--port', '8080'], {})).toMatchObject({
      host: '0.0.0.0',
      port: 8080,
    });
    expect(parseArgs(['--host=0.0.0.0', '--port=8080'], {})).toMatchObject({
      host: '0.0.0.0',
      port: 8080,
    });
    expect(parseArgs(['-p', '8080'], {}).port).toBe(8080);
  });

  it('rejects an invalid port', () => {
    expect(() => parseArgs(['--port', 'abc'], {})).toThrow(/Invalid port/);
    expect(() => parseArgs(['--port', '99999'], {})).toThrow(/Invalid port/);
  });

  it('rejects a flag without a value', () => {
    expect(() => parseArgs(['--host'], {})).toThrow(/Missing value for --host/);
  });

  it('rejects unknown options', () => {
    expect(() => parseArgs(['--nope'], {})).toThrow(/Unknown option: --nope/);
  });

  it('rejects the removed transport flags', () => {
    expect(() => parseArgs(['--stdio'], {})).toThrow(/Unknown option: --stdio/);
    expect(() => parseArgs(['--http'], {})).toThrow(/Unknown option: --http/);
    expect(() => parseArgs(['--transport', 'http'], {})).toThrow(/Unknown option: --transport/);
  });

  it('falls back to environment variables', () => {
    expect(parseArgs([], { HOST: '0.0.0.0', PORT: '9000' })).toMatchObject({
      host: '0.0.0.0',
      port: 9000,
    });
  });

  it('rejects invalid environment values', () => {
    expect(() => parseArgs([], { PORT: 'abc' })).toThrow(/PORT/);
  });

  it('gives command line arguments precedence over the environment', () => {
    const options = parseArgs(['--port', '1234'], { HOST: '10.0.0.1', PORT: '9000' });
    expect(options).toMatchObject({ host: '10.0.0.1', port: 1234 });
  });

  it('recognises help and version flags', () => {
    expect(parseArgs(['--help'], {}).help).toBe(true);
    expect(parseArgs(['-h'], {}).help).toBe(true);
    expect(parseArgs(['--version'], {}).version).toBe(true);
    expect(parseArgs(['-v'], {}).version).toBe(true);
    expect(USAGE).toContain('organizze-mcp');
  });
});
