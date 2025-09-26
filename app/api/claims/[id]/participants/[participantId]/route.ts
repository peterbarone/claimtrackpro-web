import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_NAME = process.env.COOKIE_NAME || 'ctrk_jwt';
const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');

export async function DELETE(_req: Request, { params }: { params: { id: string; participantId: string } }) {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!params.participantId) return NextResponse.json({ error: 'participantId required' }, { status: 400 });
  try {
    const r = await fetch(`${DIRECTUS_URL}/items/claims_contacts/${encodeURIComponent(params.participantId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!r.ok) return NextResponse.json({ error: 'Delete failed' }, { status: r.status });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: String(e?.message || e) }, { status: 500 });
  }
}
