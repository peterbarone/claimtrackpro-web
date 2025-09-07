// app/page.tsx
import { createDirectus, rest, staticToken, readItems } from '@directus/sdk';

type Claim = { id: string };

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function makeClient() {
  const url = getEnv('NEXT_PUBLIC_DIRECTUS_URL'); // visible to browser, but we use on server here
  const token = getEnv('DIRECTUS_STATIC_TOKEN');   // server-only
  return createDirectus(url).with(rest()).with(staticToken(token));
}

async function testQuery() {
  try {
    const client = makeClient();
    const data = await client.request(readItems('claims', { limit: 1 }));
    return { ok: true as const, count: Array.isArray(data) ? data.length : 0 };
  } catch (err: any) {
    const msg = err?.message || String(err);
    // Try to capture Directus error payloads if present
    const details = (err?.errors || err?.response || err?.cause) ?? null;
    return { ok: false as const, error: msg, details };
  }
}

export default async function Page() {
  const res = await testQuery();

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      <h1>ClaimTrackPro</h1>
      <p>
        Directus URL: <code>{process.env.NEXT_PUBLIC_DIRECTUS_URL}</code>
      </p>

      {res.ok ? (
        <p>✅ Connected (token auth). Example query returned {res.count} item(s) from <code>claims</code>.</p>
      ) : (
        <div>
          <p>❌ Could not query Directus.</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f6f6', padding: 12, borderRadius: 8 }}>
            {res.error}
          </pre>
          {res.details ? (
            <details>
              <summary>Details</summary>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f6f6', padding: 12, borderRadius: 8 }}>
                {typeof res.details === 'string' ? res.details : JSON.stringify(res.details, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      )}

      <p>Health: <a href="/health">/health</a></p>
    </main>
  );
}



