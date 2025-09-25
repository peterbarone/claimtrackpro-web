// app/api/claim-tasks/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

const COOKIE_NAME = process.env.COOKIE_NAME || "ctrk_jwt";
const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL;
if (!DIRECTUS_URL) throw new Error("Missing DIRECTUS_URL/NEXT_PUBLIC_DIRECTUS_URL");

const TaskSchema = z.object({
  claimId: z.union([z.string(), z.number()]),
  status: z.string().min(1), // e.g., "open", "in_progress", "blocked", "done"
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assigneeId: z.union([z.string(), z.number()]).optional().nullable(),
  title: z.string().min(1).max(200),
  details: z.string().optional().nullable(),
  dueDate: z.string().datetime().or(z.string().date()).or(z.string().min(1)).optional().nullable(),
});

async function directusFetch<T>(path: string, init: RequestInit = {}, token?: string) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers || {}),
  };
  const r = await fetch(`${DIRECTUS_URL}${path}`, { ...init, headers, cache: "no-store" });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Directus error ${r.status}: ${txt || r.statusText}`);
  }
  return (await r.json()) as T;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = TaskSchema.parse(body);

    const token = cookies().get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Create task in Directus
    const payload = {
      claim: data.claimId,
      status: data.status,
      priority: data.priority,
      assignee: data.assigneeId || null,
      title: data.title,
      details: data.details || null,
      due_date: data.dueDate || null,
      // date_created is auto by Directus
    };

    const created = await directusFetch<{ data: any }>(`/items/claim_tasks`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, token);

    return NextResponse.json({ data: created.data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 400 });
  }
}
