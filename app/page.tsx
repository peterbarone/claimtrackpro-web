// app/page.tsx
import { createDirectus, rest, readItems } from '@directus/sdk';

type Claim = { id: string };

async function getData() {
  const url = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
  const client = createDirectus(url).with(rest());
  try {
    const items = await client.request(readItems('claims', { limit: 1 })); // ← changed
    return { ok: true, count: Array.isArray(items) ? items.length : 0, url };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown', url };
  }
}

export default async function Page() {
  const res = await getData();
  return (
    <main style={{ padding: 32 }}>
      <h1>ClaimTrackPro</h1>
      <p>Directus URL: <code>{res.url}</code></p>
      {res.ok ? (
        <p>✅ Connected to Directus. Example query returned {res.count} item(s).</p>
      ) : (
        <p>❌ Could not query Directus: {res.error}</p>
      )}
      <p>Health: <a href="/health">/health</a></p>
    </main>
  );
}

