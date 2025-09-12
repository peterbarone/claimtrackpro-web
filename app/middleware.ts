import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import directusBase from './lib/directus';
import { readMe } from '@directus/sdk';

type Me = {
  role?: { id: string; name: string } | null;
};

const PROTECTED: Array<{ prefix: string; roles?: string[] }> = [
  { prefix: '/dashboard', roles: ['Admin', 'Manager', 'Adjuster'] },
  { prefix: '/admin', roles: ['Admin'] },
  // Public pages need no entry
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rule = PROTECTED.find(r => pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next();

  // Read tokens from cookies
  const access = req.cookies.get('d_access')?.value;
  const refresh = req.cookies.get('d_refresh')?.value;

  if (!access && !refresh) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
  }

  try {
    const client = directusBase('/', { method: 'GET' }, access ?? '');

    if (access) client.setToken(access);

    let res = await client.request<Me>(readMe({ fields: ['role.id', 'role.name'] }));

    // If access is missing/expired, attempt refresh
    if (!res?.role?.name && refresh) {
      const data = await client.refresh({ refresh_token: refresh });

      // Re-issue cookies with the new tokens
      const next = NextResponse.next();
      if (data?.access_token) {
        next.cookies.set('d_access', data.access_token, {
          httpOnly: true,
          sameSite: 'lax', // change to 'none' if cross-site
          path: '/',
          secure: true,
          maxAge: 60 * 60, // 1h
        });
        client.setToken(data.access_token);
      }
      if (data?.refresh_token) {
        next.cookies.set('d_refresh', data.refresh_token, {
          httpOnly: true,
          sameSite: 'lax', // change to 'none' if cross-site
          path: '/',
          secure: true,
          maxAge: 60 * 60 * 24 * 30, // 30d
        });
      }

      // Re-check role
      res = await client.request<Me>(readMe({ fields: ['role.id', 'role.name'] }));

      if (!res?.role?.name || (rule.roles && !rule.roles.includes(res.role.name))) {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
      return next;
    }

    // Role check with current (or refreshed) token
    if (!res?.role?.name || (rule.roles && !rule.roles.includes(res.role.name))) {
      return NextResponse.redirect(new URL('/forbidden', req.url));
    }

    return NextResponse.next();
  } catch {
    // On any error, go to login
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
