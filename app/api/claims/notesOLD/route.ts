import { NextResponse } from "next/server";

export function GET() {
	return NextResponse.json(
		{ error: "Use /api/claims/{id}/notes for per-claim notes." },
		{ status: 400 }
	);
}

export function POST() {
	return NextResponse.json(
		{ error: "Use POST /api/claims/{id}/notes to create a note for a claim." },
		{ status: 400 }
	);
}
//app/api/claims/notes/route.ts
