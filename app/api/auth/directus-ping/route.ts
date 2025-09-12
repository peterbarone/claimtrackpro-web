export async function GET() {
  const BASE = process.env.DIRECTUS_URL!;
  const TOKEN = process.env.DIRECTUS_TOKEN!;
  const r = await fetch(`${BASE}/collections`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  const data = await r.json();
  return new Response(JSON.stringify({
    ok: r.ok,
    count: Array.isArray(data?.data) ? data.data.length : null,
  }), { headers: { 'content-type': 'application/json' } });
}
