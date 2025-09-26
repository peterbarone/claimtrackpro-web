import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import directusFetch from '../../../../lib/directus';

const COOKIE_NAME = process.env.COOKIE_NAME || 'ctrk_jwt';
const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');

// GET list participants for a claim
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const claimId = params.id;
    const path = `/items/claims/${encodeURIComponent(claimId)}?fields=claims_contacts.id,claims_contacts.role,claims_contacts.contacts_id.id,claims_contacts.contacts_id.first_name,claims_contacts.contacts_id.last_name`;
    const res = await directusFetch(path, { method: 'GET' }, token);
    const rows = (res?.data?.claims_contacts || []).map((r: any) => ({
      id: r.id,
      role: r.role || '',
      contactId: r?.contacts_id?.id,
      name: `${r?.contacts_id?.first_name || ''} ${r?.contacts_id?.last_name || ''}`.trim(),
    }));
    return NextResponse.json({ data: rows });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: String(e?.message || e) }, { status: 500 });
  }
}

// POST add participant { contactId, role }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const contactId = body.contactId || body.contact_id;
  const role = body.role || '';
  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 });
  try {
    // Assuming junction table name is claims_contacts
    const payload = { claim_id: params.id, contacts_id: contactId, role };
    const r = await fetch(`${DIRECTUS_URL}/items/claims_contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return NextResponse.json({ error: 'Create failed', detail: j }, { status: r.status });
    return NextResponse.json({ data: j?.data || j }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: String(e?.message || e) }, { status: 500 });
  }
}
