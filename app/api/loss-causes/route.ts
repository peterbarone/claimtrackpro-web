// app/api/loss-causes/route.ts
import { NextResponse } from "next/server";
import { getTokens } from "@/lib/auth-cookies";

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL;
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;

function dx(path: string, init?: RequestInit) {
  if (!DIRECTUS_URL) throw new Error("Missing DIRECTUS_URL");
  const { access } = getTokens();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(access ? { Authorization: `Bearer ${access}` } : SERVICE_TOKEN ? { Authorization: `Bearer ${SERVICE_TOKEN}` } : {}),
    ...(init?.headers || {}),
  };
  return fetch(`${DIRECTUS_URL}${path}`, { ...init, headers });
}

export async function GET() {
  try {
    const res = await dx("/items/loss_cause?fields=id,name&sort=name");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Directus loss-causes fetch failed:", res.status, data);
      return NextResponse.json({ error: "Failed to fetch loss causes", detail: data }, { status: res.status || 500 });
    }
    return NextResponse.json({ data: (data as any).data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
