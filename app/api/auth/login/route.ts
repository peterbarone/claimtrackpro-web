import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loginWithPassword } from '../../../lib/auth';

const Schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const user = await loginWithPassword(parsed.data.email, parsed.data.password);
    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: 'Invalid credentials' }, { status: 401 });
  }
}
