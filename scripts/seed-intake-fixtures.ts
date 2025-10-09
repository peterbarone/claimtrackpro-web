import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: resolve(process.cwd(), ".env.local") });
import directusFetch from "@/lib/directus";

const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
if (!DIRECTUS_URL) {
  console.error("DIRECTUS_URL is required for seeding");
  process.exit(1);
}

let token = (process.env.DIRECTUS_TOKEN || process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN) as string | undefined;
const svcEmail = process.env.DIRECTUS_EMAIL as string | undefined;
const svcPassword = process.env.DIRECTUS_PASSWORD as string | undefined;

async function ensureAuthToken(): Promise<string> {
  // If token present, validate it with a ping
  if (token) {
    try {
      const res = await fetch(`${DIRECTUS_URL}/server/ping`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) return token;
    } catch {}
  }
  // Try to login via service credentials
  if (svcEmail && svcPassword) {
    const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: svcEmail, password: svcPassword }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (res.ok && json?.data?.access_token) {
      token = json.data.access_token as string;
      return token!;
    }
    throw new Error(`Service login failed (${res.status}): ${JSON.stringify(json)}`);
  }
  throw new Error('No valid DIRECTUS_TOKEN and no DIRECTUS_EMAIL/PASSWORD provided');
}

async function ensureRole(name: string, key: string) {
  const found = await directusFetch(`/items/roles?filter[key][_eq]=${encodeURIComponent(key)}`, { method: 'GET', headers: { Accept: 'application/json' } }, token);
  if (found?.data?.length) return found.data[0];
  const created = await directusFetch(`/items/roles`, { method: 'POST', body: { name, key } }, token);
  return created?.data || created;
}

async function ensureStaff(first: string, last: string, title: string, rolesByKey: string[]) {
  const email = `${first}.${last}.e2e@example.com`.toLowerCase();
  const existing = await directusFetch(`/items/staff?filter[email][_eq]=${encodeURIComponent(email)}&fields=*.*`, { method: 'GET' }, token);
  let staff = existing?.data?.[0];
  if (!staff) {
    const created = await directusFetch(`/items/staff`, {
      method: 'POST',
      body: { first_name: first, last_name: last, title, email, phone: '3155551212', phone_ext: '123' }
    }, token);
    staff = created?.data || created;
  }
  // attach roles
  if (rolesByKey.length) {
    const roles = await directusFetch(`/items/roles?filter[key][_in]=${rolesByKey.map(encodeURIComponent).join(',')}`, { method: 'GET' }, token);
    const roleIds: string[] = roles?.data?.map((r: any) => r.id) || [];
    for (const rid of roleIds) {
      try {
        await directusFetch(`/items/staff_roles`, { method: 'POST', body: { staff_id: staff.id, role_id: rid } }, token);
      } catch {}
    }
  }
  return staff;
}

async function ensureCarrierWithContacts() {
  const name = 'E2E Carrier Co';
  const carrierFound = await directusFetch(`/items/carriers?filter[name][_eq]=${encodeURIComponent(name)}`, { method: 'GET' }, token);
  const carrier = carrierFound?.data?.[0] || (await directusFetch(`/items/carriers`, {
    method: 'POST',
    body: {
      name, naic: '999999', phone: '8005550100', phone_ext: '9', email: 'claims@e2ecarrier.example',
      address: { street_1: '1 Test Way', city: 'Utica', state: 'NY', postal_code: '13501' }
    }
  }, token)).data;

  const contacts = [
    { first_name: 'Carrie', last_name: 'One', company: name, email: 'carrie.one@e2e.example', phone: '3155552001', phone_ext: '201', role: 'Client Contact', title: 'Supervisor' },
    { first_name: 'Carl', last_name: 'Two', company: name, email: 'carl.two@e2e.example', phone: '3155552002', phone_ext: '202', role: 'Client Contact', title: 'Coordinator' }
  ];
  for (const c of contacts) {
    const exists = await directusFetch(`/items/contacts?filter[email][_eq]=${encodeURIComponent(c.email)}`, { method: 'GET' }, token);
    if (!exists?.data?.length) {
      await directusFetch(`/items/contacts`, { method: 'POST', body: c }, token);
    }
  }
  return carrier;
}

async function main() {
  token = await ensureAuthToken();
  await ensureRole('Manager', 'manager');
  await ensureRole('Adjuster', 'adjuster');
  await ensureStaff('Mary', 'Manager', 'Claims Manager', ['manager']);
  await ensureStaff('Adam', 'Adjuster', 'Senior Adjuster', ['adjuster']);
  await ensureCarrierWithContacts();
  console.log('Fixtures ready.');
}

main().catch((e) => { console.error(e); process.exit(1); });
