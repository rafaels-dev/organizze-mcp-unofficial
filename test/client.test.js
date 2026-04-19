import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock before importing the module so dotenv doesn't override env vars.
vi.mock('dotenv/config', () => ({}));

const BASE_URL = 'https://api.organizze.com.br/rest/v2';

function mockFetch(status, body) {
  const text = body === null ? '' : JSON.stringify(body);
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
  });
}

describe('request()', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    process.env.ORGANIZZE_EMAIL = 'test@example.com';
    process.env.ORGANIZZE_API_TOKEN = 'secret';
    process.env.ORGANIZZE_USER_AGENT = 'Test Agent';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.ORGANIZZE_EMAIL;
    delete process.env.ORGANIZZE_API_TOKEN;
    delete process.env.ORGANIZZE_USER_AGENT;
    vi.resetModules();
  });

  it('throws when ORGANIZZE_EMAIL is missing', async () => {
    delete process.env.ORGANIZZE_EMAIL;
    const { request } = await import('../src/client.js');
    await expect(request('/accounts')).rejects.toThrow('Missing credentials');
  });

  it('throws when ORGANIZZE_API_TOKEN is missing', async () => {
    delete process.env.ORGANIZZE_API_TOKEN;
    const { request } = await import('../src/client.js');
    await expect(request('/accounts')).rejects.toThrow('Missing credentials');
  });

  it('throws when ORGANIZZE_USER_AGENT is missing', async () => {
    delete process.env.ORGANIZZE_USER_AGENT;
    const { request } = await import('../src/client.js');
    await expect(request('/accounts')).rejects.toThrow('Missing credentials');
  });

  it('sends GET request with correct URL and Authorization header', async () => {
    const fakeFetch = mockFetch(200, [{ id: 1 }]);
    global.fetch = fakeFetch;

    const { request } = await import('../src/client.js');
    const data = await request('/accounts');

    expect(fakeFetch).toHaveBeenCalledOnce();
    const [url, options] = fakeFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/accounts`);
    expect(options.method).toBe('GET');

    const expected = 'Basic ' + Buffer.from('test@example.com:secret').toString('base64');
    expect(options.headers['Authorization']).toBe(expected);
    expect(options.headers['User-Agent']).toBe('Test Agent');
    expect(data).toEqual([{ id: 1 }]);
  });

  it('sends POST request with JSON body', async () => {
    const fakeFetch = mockFetch(201, { id: 42 });
    global.fetch = fakeFetch;

    const { request } = await import('../src/client.js');
    const payload = { name: 'Conta', type: 'checking' };
    const data = await request('/accounts', { method: 'POST', body: payload });

    const [, options] = fakeFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify(payload));
    expect(data).toEqual({ id: 42 });
  });

  it('returns null for 204 No Content', async () => {
    global.fetch = mockFetch(204, null);

    const { request } = await import('../src/client.js');
    const data = await request('/accounts/1', { method: 'DELETE' });
    expect(data).toBeNull();
  });

  it('throws with API error message on non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve(JSON.stringify({ error: 'Validation failed' })),
    });

    const { request } = await import('../src/client.js');
    await expect(request('/accounts')).rejects.toThrow('Organizze API error 422: Validation failed');
  });

  it('throws on non-JSON response body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    const { request } = await import('../src/client.js');
    await expect(request('/accounts')).rejects.toThrow('Non-JSON response (500)');
  });

  it('sends the configured User-Agent header', async () => {
    const fakeFetch = mockFetch(200, []);
    global.fetch = fakeFetch;

    const { request } = await import('../src/client.js');
    await request('/accounts');

    const [, options] = fakeFetch.mock.calls[0];
    expect(options.headers['User-Agent']).toBe('Test Agent');
  });
});
