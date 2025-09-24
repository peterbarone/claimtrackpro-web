// /lib/directus.ts
// Use native fetch for custom REST endpoints, supporting token authentication
export default async function directusFetch(
  path: string,
  opts: { method: string },
  token?: string
) {
  const base = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
  if (!base) throw new Error('DIRECTUS_URL is not set');

  const fullUrl = base + path;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(fullUrl, {
    method: opts.method,
    headers,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Directus error ${res.status}: ${await res.text()}`);
  return await res.json();
}
