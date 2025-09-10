import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { directusBase } from './lib/directus';
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

  // Validate user & role on the server (fast: Directus /users/me)
  try {
    const client = directusBase();
    if (access) client.setToken(access);
  let res = await client.request<Me>(readMe({ fields: ['role.id', 'role.name'] }));

    // If access expired, attempt refresh (server-side)
    if (!res?.role?.name) {
      if (refresh) {
        const data = await client.refresh({ refresh_token: refresh });
        // Send refreshed tokens back to client
        const next = NextResponse.next();
        if (data.access_token) {
          next.cookies.set('d_access', data.access_token, { httpOnly: true, sameSite: 'lax', path: '/', secure: true, maxAge: 3600 });
          client.setToken(data.access_token);
        }
        if (data.refresh_token) {
          next.cookies.set('d_refresh', data.refresh_token, { httpOnly: true, sameSite: 'lax', path: '/', secure: true, maxAge: 3600 * 24 * 30 });
        }
        res = await client.request<Me>(readMe({ fields: ['role.id', 'role.name'] }));
        // Continue with refreshed cookies attached
        if (!res?.role?.name || (rule.roles && !rule.roles.includes(res.role.name))) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        return next;
      }
    }

    if (!res?.role?.name || (rule.roles && !rule.roles.includes(res.role.name))) {
      return NextResponse.redirect(new URL('/forbidden', req.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
  ],
};
