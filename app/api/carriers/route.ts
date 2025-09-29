import { NextResponse } from "next/server";
import { getTokens } from "@/lib/auth-cookies";

const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;
const SERVICE_EMAIL = process.env.DIRECTUS_EMAIL;
const SERVICE_PASSWORD = process.env.DIRECTUS_PASSWORD;

async function dx(path: string, init?: RequestInit) {
  if (!DIRECTUS_URL) throw new Error("Missing DIRECTUS_URL");
  const { access } = getTokens();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(access ? { Authorization: `Bearer ${access}` } : SERVICE_TOKEN ? { Authorization: `Bearer ${SERVICE_TOKEN}` } : {}),
    ...(init?.headers || {}),
  };
  const doFetch = async (bearer?: string) => {
    const auth = bearer ? { Authorization: `Bearer ${bearer}` } : {};
  return fetch(`${DIRECTUS_URL}${path}`, { ...init, headers: { ...headers, ...auth } });
  };

  let res = await doFetch();
  if (res.status === 401 && SERVICE_EMAIL && SERVICE_PASSWORD) {
    try {
  const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: SERVICE_EMAIL, password: SERVICE_PASSWORD })
      });
      const loginJson = await loginRes.json().catch(() => ({}));
      if (loginRes.ok && (loginJson as any)?.data?.access_token) {
        const token = (loginJson as any).data.access_token as string;
        res = await doFetch(token);
      }
    } catch {}
  }
  return res;
}

// GET /api/carriers  -> list carriers (basic pagination support via limit/offset query params)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 50);
    const offset = Number(searchParams.get("offset") || 0);
    const fields = [
      "id",
      "name",
      "naic",
      "address.id",
      "address.street_1",
      "address.street_2",
      "address.city",
      "address.state",
      "address.postal_code",
      "phone",
      "email",
      "claims_email_intake",
    ].join(",");

    const res = await dx(`/items/carriers?fields=${encodeURIComponent(fields)}&sort=name&limit=${limit}&offset=${offset}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Directus carriers fetch failed:", res.status, data);
      return NextResponse.json({ error: "Failed to fetch carriers", detail: data }, { status: res.status || 500 });
    }
    return NextResponse.json({ data: (data as any).data || [], meta: (data as any).meta });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

// POST /api/carriers -> create carrier
// Accepts optional "address" field which should be an existing address ID (uuid) referencing the Directus addresses collection.
// To create a new address first, call POST /api/addresses then supply that id here.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const payload: Record<string, any> = {};
    for (const k of ["name", "naic", "address", "phone", "email", "claims_email_intake"]) {
      if (body[k] !== undefined) payload[k] = body[k];
    }
    if (!payload.name) {
      return NextResponse.json({ error: "'name' is required" }, { status: 400 });
    }
    const res = await dx(`/items/carriers`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to create carrier", detail: data }, { status: res.status || 500 });
    }
    return NextResponse.json({ data: (data as any).data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
