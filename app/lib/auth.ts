import { directusBase } from './directus';
import type { RestCommand } from '@directus/sdk';
// Custom RestCommand for /users/me
const getUserMe = (): RestCommand<any, any> => () => ({
  path: '/users/me',
  method: 'GET',
  params: { fields: 'id,email,first_name,last_name,role.id,role.name' },
});
import { getTokens, setTokens, clearTokens } from './auth-cookies';

type Me = {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | { id: string; name: string }; // depending on fields/expansion
};

export async function loginWithPassword(email: string, password: string) {
  const client = directusBase();
  // Directus SDK v10+ expects a payload object for login
  const { access_token, refresh_token } = await client.login({ email, password });
  if (access_token && refresh_token) {
    setTokens({ access_token, refresh_token });
  }
  return await getMe(); // return user after setting cookies
}

export async function logout() {
  try {
    const client = directusBase();
    const { refresh } = getTokens();
    if (refresh) await client.logout({ refresh_token: refresh });
  } catch {/* ignore */}
  clearTokens();
}

export async function getMe(): Promise<Me | null> {
  const client = directusBase();
  const { access, refresh } = getTokens();

  if (!access && !refresh) return null;

  // Try current access token, otherwise refresh
  try {
    if (access) client.setToken(access);
    // Use the SDK's built-in request for /users/me
  const me = await client.request(getUserMe());
  return me as Me;
  } catch {
    // Attempt refresh
    if (!refresh) return null;
    try {
      const { access_token, refresh_token } = await client.refresh({ refresh_token: refresh });
      if (access_token && refresh_token) {
        setTokens({ access_token, refresh_token });
        client.setToken(access_token);
      }
  const me = await client.request(getUserMe());
  return me as Me;
    } catch {
      clearTokens();
      return null;
    }
  }
}
