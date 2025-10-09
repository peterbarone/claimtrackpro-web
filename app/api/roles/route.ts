// app/api/roles/route.ts
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const internalOnlyParam = url.searchParams.get("internalOnly");
    const internalOnly = ["1", "true", "yes"].includes(
      String(internalOnlyParam || "").toLowerCase()
    );

    // If not filtering, fetch vanilla list (minimal fields for UI)
    if (!internalOnly) {
      const res = await dx(`/items/roles?fields=id,name&sort=name`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Directus roles fetch failed:", res.status, data);
        return NextResponse.json(
          { error: "Failed to fetch roles", detail: data },
          { status: res.status || 500 }
        );
      }
      return NextResponse.json({ data: (data as any).data || [] });
    }

    // Internal-only filtering support. Different environments may label the flag differently.
    // We'll try a sequence of likely filters against Directus and fall back to a key/name whitelist.
    const candidates = [
      // Common patterns
      `filter[audience][_eq]=internal`,
      `filter[internal][_eq]=true`,
      `filter[internal_only][_eq]=true`,
      `filter[visibility][_eq]=internal`,
      `filter[type][_eq]=internal`,
      `filter[category][_eq]=internal`,
    ];

    let collected: any[] | null = null;
    let lastStatus = 200;
    let lastBody: any = null;

    for (const q of candidates) {
      try {
        const res = await dx(`/items/roles?${q}&fields=id,name,key&sort=name`);
        lastStatus = res.status;
        const data = await res.json().catch(() => ({}));
        lastBody = data;
        if (res.ok && Array.isArray((data as any)?.data)) {
          const arr = (data as any).data as any[];
          if (arr.length > 0) {
            collected = arr;
            break;
          }
        }
      } catch {}
    }

    if (!collected) {
      // Fallback: fetch all and filter by a conservative whitelist of internal role keys/names
      const res = await dx(`/items/roles?fields=id,name,key&sort=name`);
      lastStatus = res.status;
      const data = await res.json().catch(() => ({}));
      lastBody = data;
      if (!res.ok) {
        console.error("Directus roles fetch failed:", res.status, data);
        return NextResponse.json(
          { error: "Failed to fetch roles", detail: data },
          { status: res.status || 500 }
        );
      }
      const internalKeys = new Set([
        "manager",
        "adjuster",
        "desk_adjuster",
        "field_adjuster",
        "executive_general_adjuster",
        "admin",
        "administrator",
      ]);
      const internalNames = new Set([
        "Manager",
        "Adjuster",
        "Desk Adjuster",
        "Field Adjuster",
        "Executive General Adjuster",
        "Admin",
        "Administrator",
      ]);
      const all: any[] = Array.isArray((data as any)?.data) ? (data as any).data : [];
      collected = all.filter((r) => {
        const key = String((r as any)?.key || "").toLowerCase();
        const name = String((r as any)?.name || "").trim();
        return internalKeys.has(key) || internalNames.has(name);
      });
    }

    // Return minimal shape
    return NextResponse.json({ data: collected.map((r) => ({ id: r.id, name: r.name })) });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
