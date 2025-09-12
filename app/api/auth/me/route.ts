import { NextResponse } from 'next/server';
import { getMe } from '../../../lib/auth';

export async function GET() {
  try {
    // Debug: log tokens and user
    const { getTokens } = await import('../../../lib/auth-cookies');
    const tokens = getTokens();
    console.log('API /api/auth/me tokens:', tokens);
    const user = await getMe();
    console.log('API /api/auth/me user:', user);
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error('API /api/auth/me error:', e);
    return NextResponse.json({ ok: false, message: 'Error fetching user' }, { status: 500 });
  }
}
