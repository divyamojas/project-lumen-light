import { assignAccentColor, generateId } from "./utils";

const STORAGE_KEY = "lumen_entries";
const UI_MODE_KEY = "lumen_ui_mode";
const PREVIEW_MODE_KEY = "lumen_preview_mode";
const DRAFT_KEY_PREFIX = "lumen_draft_";

const isBrowser = () => typeof window !== "undefined";

const normalizeText = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizeCreatedAt = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const sanitizeEntry = (entry) => {
  const title = normalizeText(entry?.title).slice(0, 100);
  const body = normalizeText(entry?.body);

  if (!title || !body) {
    return null;
  }

  return {
    id: typeof entry?.id === "string" && entry.id ? entry.id : generateId(),
    title,
    body,
    createdAt: normalizeCreatedAt(entry?.createdAt),
    accentColor:
      entry?.accentColor &&
      typeof entry.accentColor === "object" &&
      typeof entry.accentColor.bg === "string"
        ? entry.accentColor
        : assignAccentColor(),
    theme: typeof entry?.theme === "string" && entry.theme ? entry.theme : "neutral",
  };
};

const parseEntries = (value) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

export const getEntries = () => {
  if (!isBrowser()) {
    return [];
  }

  const entries = parseEntries(window.localStorage.getItem(STORAGE_KEY))
    .map(sanitizeEntry)
    .filter(Boolean);

  return [...entries].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
};

export const getEntryById = (id) => {
  return getEntries().find((entry) => entry.id === id) || null;
};

export const saveEntries = (entries) => {
  if (!isBrowser()) {
    return [];
  }

  const sanitizedEntries = entries.map(sanitizeEntry).filter(Boolean);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedEntries));
  return sanitizedEntries;
};

export const createEntry = ({ title, body }) => {
  const entry = sanitizeEntry({
    id: generateId(),
    title,
    body,
    createdAt: new Date().toISOString(),
    accentColor: assignAccentColor(),
    theme: "neutral",
  });

  const entries = [entry, ...getEntries()];
  saveEntries(entries);
  return entry;
};

export const updateEntry = (id, updates) => {
  const entries = getEntries();
  const currentEntry = entries.find((entry) => entry.id === id);

  if (!currentEntry) {
    return null;
  }

  const nextEntry = sanitizeEntry({
    ...currentEntry,
    title: updates?.title ?? currentEntry.title,
    body: updates?.body ?? currentEntry.body,
  });

  const nextEntries = entries.map((entry) => {
    return entry.id === id ? nextEntry : entry;
  });

  saveEntries(nextEntries);
  return nextEntry;
};

export const deleteEntry = (id) => {
  const nextEntries = getEntries().filter((entry) => entry.id !== id);
  saveEntries(nextEntries);
  return nextEntries;
};

export const importEntries = (importedEntries) => {
  if (!Array.isArray(importedEntries)) {
    return { entries: getEntries(), importedCount: 0 };
  }

  const currentEntries = getEntries();
  const entriesById = new Map(currentEntries.map((entry) => [entry.id, entry]));
  let importedCount = 0;

  importedEntries.forEach((entry) => {
    const sanitizedEntry = sanitizeEntry(entry);

    if (!sanitizedEntry) {
      return;
    }

    entriesById.set(sanitizedEntry.id, sanitizedEntry);
    importedCount += 1;
  });

  const nextEntries = saveEntries(Array.from(entriesById.values()));

  return {
    entries: nextEntries,
    importedCount,
  };
};

export const getUiMode = () => {
  if (!isBrowser()) {
    return "auto";
  }

  const savedValue = window.localStorage.getItem(UI_MODE_KEY);

  return ["auto", "light", "dark"].includes(savedValue) ? savedValue : "auto";
};

export const saveUiMode = (mode) => {
  if (!isBrowser()) {
    return "auto";
  }

  const nextMode = ["auto", "light", "dark"].includes(mode) ? mode : "auto";
  window.localStorage.setItem(UI_MODE_KEY, nextMode);
  return nextMode;
};

export const getPreviewMode = () => {
  if (!isBrowser()) {
    return "comfortable";
  }

  const savedValue = window.localStorage.getItem(PREVIEW_MODE_KEY);
  return ["compact", "comfortable"].includes(savedValue) ? savedValue : "comfortable";
};

export const savePreviewMode = (mode) => {
  if (!isBrowser()) {
    return "comfortable";
  }

  const nextMode = ["compact", "comfortable"].includes(mode) ? mode : "comfortable";
  window.localStorage.setItem(PREVIEW_MODE_KEY, nextMode);
  return nextMode;
};

export const getDraft = (draftId) => {
  if (!isBrowser()) {
    return null;
  }

  const draft = window.localStorage.getItem(`${DRAFT_KEY_PREFIX}${draftId}`);

  if (!draft) {
    return null;
  }

  try {
    const parsed = JSON.parse(draft);
    return {
      title: typeof parsed?.title === "string" ? parsed.title : "",
      body: typeof parsed?.body === "string" ? parsed.body : "",
    };
  } catch (_error) {
    return null;
  }
};

export const saveDraft = (draftId, draft) => {
  if (!isBrowser()) {
    return null;
  }

  const nextDraft = {
    title: typeof draft?.title === "string" ? draft.title.slice(0, 100) : "",
    body: typeof draft?.body === "string" ? draft.body : "",
  };

  window.localStorage.setItem(`${DRAFT_KEY_PREFIX}${draftId}`, JSON.stringify(nextDraft));
  return nextDraft;
};

export const clearDraft = (draftId) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(`${DRAFT_KEY_PREFIX}${draftId}`);
};

export default {
  getEntries,
  getEntryById,
  saveEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  importEntries,
  getUiMode,
  saveUiMode,
  getPreviewMode,
  savePreviewMode,
  getDraft,
  saveDraft,
  clearDraft,
};
