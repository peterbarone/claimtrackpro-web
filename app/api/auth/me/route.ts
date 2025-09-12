// /app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import directusBase from '../../../lib/directus';
import { readMe } from '@directus/sdk';

type Me = {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: { id: string; name: string } | null;
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

  const client = directusBase();

  async function fetchMe() {
    const me = await client.request<Me>(readMe({ fields: ['id', 'email', 'first_name', 'last_name', 'role.id', 'role.name'] }));
    return me;
  }

  try {
    if (access) client.setToken(access);
    let me = await fetchMe();

    // If we didn't get a role (likely expired), try refresh
    if (!me?.id && refresh) {
      const tokens = await client.refresh({ refresh_token: refresh });

      // set new cookies
      const res = NextResponse.json({ ok: true, user: null }); // temp, we’ll overwrite after we get user
      if (tokens?.access_token) {
        res.cookies.set(ACCESS, tokens.access_token, {
          httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60,
        });
        client.setToken(tokens.access_token);
      }
      if (tokens?.refresh_token) {
        res.cookies.set(REFRESH, tokens.refresh_token, {
          httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
        });
      }

      me = await fetchMe();
      return NextResponse.json({ ok: true, user: me }, res);
    }

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
