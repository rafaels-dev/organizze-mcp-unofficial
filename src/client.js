import 'dotenv/config';

const BASE_URL = 'https://api.organizze.com.br/rest/v2';

function getCredentials() {
  const email = process.env.ORGANIZZE_EMAIL;
  const token = process.env.ORGANIZZE_API_TOKEN;
  const userAgent = process.env.ORGANIZZE_USER_AGENT;

  if (!email || !token || !userAgent) {
    throw new Error(
      'Missing credentials: set ORGANIZZE_EMAIL, ORGANIZZE_API_TOKEN, and ORGANIZZE_USER_AGENT environment variables.'
    );
  }

  return { email, token, userAgent };
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
