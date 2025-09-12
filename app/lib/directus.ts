// /lib/directus.ts
import { createDirectus, rest, authentication } from '@directus/sdk';

// Default export so you can: import directusBase from './lib/directus'
export default function directusBase(path: string, p0: { method: string; }, token: string) {
  const url = process.env.DIRECTUS_URL;
  if (!url) throw new Error('DIRECTUS_URL is not set');

  // authentication() plugin supports .login(), .refresh(), .logout(), .setToken()
  // rest() plugin enables .request() calls
  return createDirectus(url).with(authentication()).with(rest());
}

// If you also want to re-use a simple fetcher elsewhere, you can still add:
// export async function directusFetch<T>(path: string, opts: RequestInit = {}, token?: string): Promise<T> { ... }
