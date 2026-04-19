import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReflectionSummary,
  filterEntries,
  normalizeDraft,
  prepareImportPreview,
  resolveEntryEditorRelatedIds,
  sortEntries,
} from "../lib/journal.mjs";

const sampleEntries = [
  {
    id: "alpha1",
    title: "Morning note",
    body: "Coffee, calm, and a small win.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ["calm", "morning"],
    collection: "Personal",
    favorite: true,
    pinned: true,
  },
  {
    id: "beta22",
    title: "Work review",
    body: "Thinking about launch prep and follow-ups.",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    tags: ["work"],
    collection: "Work",
    favorite: false,
    pinned: false,
  },
  {
    id: "gamma3",
    title: "Evening reflection",
    body: "A slower day with gratitude and rest.",
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["gratitude"],
    collection: "Personal",
    favorite: false,
    pinned: false,
  },
];

test("normalizeDraft trims and sanitizes draft metadata", () => {
  const draft = normalizeDraft({
    title: "A title that stays",
    body: "Body",
    tags: [" Calm ", "Deep Work", "!!!"],
    collection: "  Personal  ",
    favorite: 1,
    pinned: "",
  });

  assert.deepEqual(draft, {
    title: "A title that stays",
    body: "Body",
    tags: ["calm", "deep-work"],
    collection: "Personal",
    favorite: true,
    pinned: false,
    templateId: "",
    promptId: "",
    relatedEntryIds: [],
    journal_type: "personal",
    type_metadata: {},
    theme: "neutral",
  });
});

test("normalizeDraft preserves editor-only metadata used during restore", () => {
  const draft = normalizeDraft({
    title: "Typed draft",
    body: "Body",
    templateId: "type-experiment",
    promptId: "What changed?",
    relatedEntryIds: ["entry-1", "entry-2", null],
    journal_type: "science",
    type_metadata: { hypothesis: "Light increases growth" },
    theme: "reflective",
  });

  assert.deepEqual(draft, {
    title: "Typed draft",
    body: "Body",
    tags: [],
    collection: "",
    favorite: false,
    pinned: false,
    templateId: "type-experiment",
    promptId: "What changed?",
    relatedEntryIds: ["entry-1", "entry-2"],
    journal_type: "science",
    type_metadata: { hypothesis: "Light increases growth" },
    theme: "reflective",
  });
});

test("resolveEntryEditorRelatedIds prefers explicit draft values over derived entries", () => {
  const relatedIds = resolveEntryEditorRelatedIds(
    ["entry-2", "entry-3"],
    [{ id: "entry-1" }]
  );

  assert.deepEqual(relatedIds, ["entry-2", "entry-3"]);
});

test("resolveEntryEditorRelatedIds falls back to related entry objects", () => {
  const relatedIds = resolveEntryEditorRelatedIds([], [
    { id: "entry-1" },
    { id: "entry-2" },
    {},
  ]);

  assert.deepEqual(relatedIds, ["entry-1", "entry-2"]);
});

test("filterEntries combines query, tags, collections, and favorites", () => {
  const filtered = filterEntries(sampleEntries, {
    query: "launch",
    selectedTags: ["work"],
    selectedCollections: ["Work"],
    onlyFavorites: false,
    onlyPinned: false,
    timeframe: "all",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "beta22");
});

test("sortEntries prioritizes pinned and favorite entries for newest mode", () => {
  const sorted = sortEntries(sampleEntries, "newest");

  assert.equal(sorted[0].id, "alpha1");
});

test("prepareImportPreview reports duplicates and invalid entries", () => {
  const preview = prepareImportPreview(sampleEntries, [
    sampleEntries[0],
    { id: "delta4", title: "Imported", body: "New body", createdAt: new Date().toISOString() },
    { nope: true },
  ]);

  assert.equal(preview.totalIncoming, 3);
  assert.equal(preview.validIncoming, 2);
  assert.equal(preview.duplicateCount, 1);
  assert.equal(preview.invalidCount, 1);
  assert.equal(preview.newCount, 1);
});

test("buildReflectionSummary counts recent entries and favorites", () => {
  const summary = buildReflectionSummary(sampleEntries);

  assert.equal(summary.totalEntries, 3);
  assert.equal(summary.thisWeekCount, 2);
  assert.equal(summary.favoriteCount, 1);
});
