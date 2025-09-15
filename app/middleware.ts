import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import directusFetch from './lib/directus';

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
    // Try to get user info with access token
    let res = null;
    if (access) {
      res = await directusFetch('/users/me?fields=role', { method: 'GET' }, access);
    }

    // If access is missing/expired, attempt refresh
    if ((!res || !res.role?.name) && refresh) {
      // Try to refresh token via your refresh endpoint
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
      const r = await fetch(`${APP_URL}/api/auth/refresh`, { method: 'POST', cache: 'no-store' });
      let newAccess = access;
      if (r.ok) {
        // Try again with new access token from cookies
        const jar2 = req.cookies;
        newAccess = jar2.get('d_access')?.value;
        res = await directusFetch('/users/me?fields=role', { method: 'GET' }, newAccess);
      }
      // Re-issue cookies with the new tokens if present in response
      const next = NextResponse.next();
      // (If you want to set cookies from the refresh response, parse and set here)
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
