// app/api/staff/route.ts
import { NextResponse } from "next/server";
import { getTokens } from "@/lib/auth-cookies";

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL;

function dx(path: string, init?: RequestInit) {
  if (!DIRECTUS_URL) throw new Error("Missing DIRECTUS_URL");
  const { access } = getTokens();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
    ...(init?.headers || {}),
  };
  return fetch(`${DIRECTUS_URL}${path}`, { ...init, headers });
}

export async function GET() {
  try {
    const res = await dx(`/items/staff?fields=id,first_name,last_name&sort=last_name,first_name`);
    const data = await res.json();
    if (!res.ok) {
      console.error("Directus staff fetch failed:", data);
      throw new Error(`Failed to fetch staff: ${JSON.stringify(data)}`);
    }
    // Return all staff as a flat array
    const staff = (data.data || []).map((s: any) => ({ id: s.id, name: `${s.first_name} ${s.last_name}`.trim() }));
    return NextResponse.json({ data: staff });
  } catch (err: any) {
    console.error("/api/staff error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
