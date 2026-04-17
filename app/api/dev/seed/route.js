import { NextResponse } from "next/server";
import SAMPLE_ENTRIES from "../../../../lib/dev-seed";
import { importHostEntries } from "../../../../lib/host-store";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Sample seeding is disabled in production." }, { status: 403 });
  }

  const result = await importHostEntries(SAMPLE_ENTRIES, {
    duplicateMode: "replace-existing",
  });

  return NextResponse.json(result);
}
