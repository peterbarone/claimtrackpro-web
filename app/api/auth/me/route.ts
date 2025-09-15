// /app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import directusFetch from '../../../lib/directus';

type Me = {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: any;
};

const ACCESS = 'd_access';
const REFRESH = 'd_refresh';

export async function GET() {
  const jar = cookies();
  const access = jar.get(ACCESS)?.value;
  const refresh = jar.get(REFRESH)?.value;

  // If no tokens, you're not logged in (not an error)
  if (!access && !refresh) {
    return NextResponse.json({ ok: true, user: null });
  }


  async function fetchMe(token?: string) {
    // Use directusFetch to call /users/me endpoint
    return directusFetch('/users/me?fields=id,email,first_name,last_name,role', { method: 'GET' }, token);
  }

  try {
  let me = await fetchMe(access);
  if (me && me.data) me = me.data;

    // If we didn't get a user (likely expired), try refresh
    if ((!me || !me.id) && refresh) {
      // Try to refresh token via your refresh endpoint
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
      const r = await fetch(`${APP_URL}/api/auth/refresh`, { method: 'POST', cache: 'no-store' });
      if (r.ok) {
        // Try again with new access token from cookies
        const jar2 = cookies();
        const newAccess = jar2.get(ACCESS)?.value;
        me = await fetchMe(newAccess);
      }
    }

  // Debug: log the user object returned from Directus
  console.log('Directus /users/me result:', me);
  // Normal success
  return NextResponse.json({ ok: true, user: me ?? null });
  } catch (err: any) {
    // If Directus returns 401 and no refresh token, treat as logged-out
    const msg = String(err?.message ?? '');
    if (msg.includes('401')) {
      return NextResponse.json({ ok: true, user: null });
    }
    // Any other error is a genuine 500
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
