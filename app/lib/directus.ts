// /lib/directus.ts
// Use native fetch for custom REST endpoints, supporting token authentication
export default async function directusFetch(
  path: string,
  opts: { method: string },
  token?: string
) {
  const url = process.env.DIRECTUS_URL;
  if (!url) throw new Error('DIRECTUS_URL is not set');

  const fullUrl = url.replace(/\/$/, '') + path;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(fullUrl, {
    method: opts.method,
    headers,
    // Add credentials or body if needed
  });
  if (!res.ok) throw new Error(`Directus error ${res.status}: ${await res.text()}`);
  return await res.json();
}
