import { NextResponse } from 'next/server';
import { getMe } from '../../../lib/auth';

export async function GET() {
  try {
    const user = await getMe();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'Error fetching user' }, { status: 500 });
  }
}
