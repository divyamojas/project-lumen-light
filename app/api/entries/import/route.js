import { NextResponse } from "next/server";
import { importHostEntries } from "../../../../lib/host-store";

export async function POST(request) {
  const payload = await request.json();
  const result = await importHostEntries(payload.entries || [], {
    duplicateMode: payload.duplicateMode,
    replaceAll: Boolean(payload.replaceAll),
  });

  return NextResponse.json(result);
}
