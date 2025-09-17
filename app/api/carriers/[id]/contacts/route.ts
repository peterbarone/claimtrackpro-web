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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const carrierId = params.id;
    if (!carrierId) throw new Error("Missing carrier id");
    // Assumes contacts table has a carrier_id field or a relation
    const res = await dx(`/items/contacts?fields=id,first_name,last_name,email,company&filter[carrier_id][_eq]=${encodeURIComponent(carrierId)}&sort=last_name,first_name`);
    const data = await res.json();
    if (!res.ok) throw new Error("Failed to fetch contacts");
    // Compose a display name for each contact
    const contacts = (data.data || []).map((c: any) => ({
      id: c.id,
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || c.company || c.id,
      email: c.email,
      company: c.company
    }));
    return NextResponse.json({ data: contacts });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
