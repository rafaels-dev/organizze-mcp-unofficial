import 'dotenv/config';

const BASE_URL = 'https://api.organizze.com.br/rest/v2';

const CREDENTIAL_VARS = ['ORGANIZZE_EMAIL', 'ORGANIZZE_API_TOKEN', 'ORGANIZZE_USER_AGENT'];

/**
 * Returns the names of the credential variables that are not set, so callers
 * can warn early instead of failing only on the first API call.
 *
 * @returns {string[]}
 */
export function missingCredentials() {
  return CREDENTIAL_VARS.filter((name) => !process.env[name]);
}

function getCredentials() {
  const missing = missingCredentials();

  if (missing.length > 0) {
    throw new Error(
      `Missing credentials: set ${CREDENTIAL_VARS.join(', ')} environment variables (missing: ${missing.join(', ')}).`
    );
  }

  return {
    email: process.env.ORGANIZZE_EMAIL,
    token: process.env.ORGANIZZE_API_TOKEN,
    userAgent: process.env.ORGANIZZE_USER_AGENT,
  };
}

export async function request(path, { method = 'GET', body } = {}) {
  const { email, token, userAgent } = getCredentials();
  const credentials = Buffer.from(`${email}:${token}`).toString('base64');

  const options = {
    method,
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': userAgent,
    },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

  if (response.status === 204) return null;

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Non-JSON response (${response.status}): ${text}`);
  }

  if (!response.ok) {
    const message = data?.error || data?.message || JSON.stringify(data);
    throw new Error(`Organizze API error ${response.status}: ${message}`);
  }

  return data;
}
