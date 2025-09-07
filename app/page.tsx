// app/page.tsx
type Ping = {
  ok: boolean;
  url: string;
  error?: string;
  status?: number;
  details?: any;
  count?: number;
};

async function pingDirectus(): Promise<Ping> {
  const url = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
  const token = process.env.DIRECTUS_STATIC_TOKEN; // optional

  // First, check Directus health
  try {
    const health = await fetch(`${url}/server/health`, { cache: "no-store" });
    if (!health.ok) {
      return { ok: false, url, status: health.status, error: `Health check failed (${health.status})` };
    }
  } catch (e: any) {
    return { ok: false, url, error: `Health request failed: ${e?.message || String(e)}` };
  }

  // Then, try fetching 1 claim (unauth first, then with token if provided)
  async function tryFetch(withToken: boolean) {
    const headers: Record<string, string> = {};
    if (withToken && token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`${url}/items/claims?limit=1`, {
      headers,
      cache: "no-store",
    });
    const text = await r.text(); // read as text so we can render any error JSON or HTML
    return { r, text };
  }

  try {
    // Unauthenticated attempt
    let { r, text } = await tryFetch(false);
    if (r.ok) {
      // parse safe
      try {
        const json = JSON.parse(text);
        const count = Array.isArray(json?.data) ? json.data.length : 0;
        return { ok: true, url, count };
      } catch {
        return { ok: true, url, count: 0, details: "Fetched but could not parse JSON." };
      }
    }

    // Try again with token if provided
    if (token) {
      const second = await tryFetch(true);
      if (second.r.ok) {
        try {
          const json = JSON.parse(second.text);
          const count = Array.isArray(json?.data) ? json.data.length : 0;
          return { ok: true, url, count };
        } catch {
          return { ok: true, url, count: 0, details: "Fetched (with token) but could not parse JSON." };
        }
      }
      return { ok: false, url, status: second.r.status, error: "Fetch with token failed", details: second.text };
    }

    // No token path
    return { ok: false, url, status: r.status, error: "Fetch without token failed", details: text };
  } catch (e: any) {
    return { ok: false, url, error: e?.message || String(e) };
  }
}

export default async function Page() {
  const res = await pingDirectus();

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>ClaimTrackPro</h1>
      <p>Directus URL: <code>{res.url}</code></p>
      {res.ok ? (
        <p>✅ Connected. Example query returned {res.count} item(s).</p>
      ) : (
        <div>
          <p>❌ Could not query Directus.</p>
          {res.status ? <p>Status: {res.status}</p> : null}
          {res.error ? <pre style={{ whiteSpace: "pre-wrap" }}>{res.error}</pre> : null}
          {res.details ? <details><summary>Details</summary><pre style={{ whiteSpace: "pre-wrap" }}>{typeof res.details === 'string' ? res.details : JSON.stringify(res.details, null, 2)}</pre></details> : null}
        </div>
      )}
      <p>Health: <a href="/health">/health</a></p>
    </main>
  );
}


