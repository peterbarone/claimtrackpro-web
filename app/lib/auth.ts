
import directusFetch from './directus';
import { getTokens, setTokens, clearTokens } from './auth-cookies';

type Me = {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | { id: string; name: string }; // depending on fields/expansion
};

export async function loginWithPassword(email: string, password: string) {
  console.log('Attempting Directus login with:', email);
  try {
  const url = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
  if (!url) throw new Error('DIRECTUS_URL is not set');
  const res = await fetch(url + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Directus login failed: ${error}`);
    }
    const data = await res.json();
    const { access_token, refresh_token } = data.data || {};
    if (access_token && refresh_token) {
      setTokens({ access_token, refresh_token });
    }
    return await getMe(); // return user after setting cookies
  } catch (err) {
    console.error('Directus login error:', err);
    throw err;
  }
}

export async function logout() {
  try {
  const url = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
  if (!url) throw new Error('DIRECTUS_URL is not set');
    const { refresh } = getTokens();
    if (refresh) {
  await fetch(url + '/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
    }
  } catch {/* ignore */}
  clearTokens();
}

export async function getMe(): Promise<Me | null> {
  const { access, refresh } = getTokens();

  if (!access && !refresh) return null;

  try {
    if (access) {
      const me = await directusFetch('/users/me?fields=id,email,first_name,last_name,role', { method: 'GET' }, access);
      return me as Me;
    }
    // Attempt refresh
    if (refresh) {
  const url = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
  if (!url) throw new Error('DIRECTUS_URL is not set');
  const res = await fetch(url + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const data = await res.json();
      const { access_token, refresh_token } = data.data || {};
      if (access_token && refresh_token) {
        setTokens({ access_token, refresh_token });
        const me = await directusFetch('/users/me?fields=id,email,first_name,last_name,role', { method: 'GET' }, access_token);
        return me as Me;
      }
      clearTokens();
      return null;
    }
    return null;
  } catch {
    clearTokens();
    return null;
  }
}
