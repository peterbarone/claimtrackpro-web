import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = process.env.COOKIE_NAME || 'ctrk_jwt';
const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');

export async function GET() {
  if (!DIRECTUS_URL) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const r = await fetch(`${DIRECTUS_URL}/items/claim_status?fields=id,name,code,status&sort=name`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!r.ok) return NextResponse.json({ error: 'Failed', status: r.status }, { status: r.status });
    const j = await r.json();
    return NextResponse.json({ data: j?.data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: String(e?.message || e) }, { status: 500 });
  }
}
