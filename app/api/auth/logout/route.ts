import { NextResponse } from 'next/server';

const COOKIE_NAME = process.env.COOKIE_NAME || 'ctrk_jwt';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'ctrk_rjwt';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === 'production';
  const expired = {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  };
  res.cookies.set(COOKIE_NAME, '', expired);
  res.cookies.set(REFRESH_COOKIE_NAME, '', expired);
  return res;
}
