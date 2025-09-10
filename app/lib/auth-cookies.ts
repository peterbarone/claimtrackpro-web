import { cookies } from 'next/headers';

const ACCESS = 'd_access';
const REFRESH = 'd_refresh';

const isProd = process.env.NODE_ENV === 'production';
const secure = process.env.COOKIE_SECURE === 'true' || isProd;

export function setTokens({ access_token, refresh_token }: { access_token: string; refresh_token: string }) {
  const jar = cookies();
  const common = { httpOnly: true, sameSite: 'lax' as const, secure, path: '/' };

  jar.set(ACCESS, access_token, { ...common, maxAge: 60 * 60 });          // 1h
  jar.set(REFRESH, refresh_token, { ...common, maxAge: 60 * 60 * 24 * 30 });// 30d
}

export function clearTokens() {
  const jar = cookies();
  jar.delete(ACCESS);
  jar.delete(REFRESH);
}

export function getTokens() {
  const jar = cookies();
  return {
    access: jar.get(ACCESS)?.value,
    refresh: jar.get(REFRESH)?.value,
  };
}
