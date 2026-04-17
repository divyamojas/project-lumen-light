import { NextResponse } from "next/server";
import {
  deleteHostEntry,
  getHostEntryById,
  updateHostEntry,
} from "../../../../lib/host-store";

export async function GET(_request, { params }) {
  const entry = await getHostEntryById(params.id);

  if (!entry) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  return NextResponse.json(entry, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request, { params }) {
  const payload = await request.json();
  const entry = await updateHostEntry(params.id, payload.updates || {});

  if (!entry) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  return NextResponse.json(entry);
}

export async function DELETE(_request, { params }) {
  const existingEntry = await getHostEntryById(params.id);

  if (!existingEntry) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  const entries = await deleteHostEntry(params.id);
  return NextResponse.json({ entries });
}
