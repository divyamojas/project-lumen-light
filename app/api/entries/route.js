import { NextResponse } from "next/server";
import { createHostEntry, getHostEntries } from "../../../lib/host-store";

export async function GET() {
  const entries = await getHostEntries();
  return NextResponse.json(entries, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const payload = await request.json();
  const entry = await createHostEntry(payload);
  return NextResponse.json(entry, { status: 201 });
}
