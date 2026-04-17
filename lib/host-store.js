import { promises as fs } from "fs";
import {
  extractChecklistItems,
  normalizeCollection,
  normalizeTag,
} from "./journal.mjs";
import { assignAccentColor, generateId } from "./utils";

const HOST_DATA_DIR = "data";
const HOST_DATA_FILE = "journal.json";

const normalizeText = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizeCreatedAt = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const sanitizeChecklist = (items, body) => {
  const source = Array.isArray(items) && items.length > 0 ? items : extractChecklistItems(body);

  return source
    .map((item, index) => {
      const text = normalizeText(item?.text);

      if (!text) {
        return null;
      }

      return {
        id: typeof item?.id === "string" && item.id ? item.id : `check-${index}-${generateId()}`,
        text,
        checked: Boolean(item?.checked),
      };
    })
    .filter(Boolean);
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
    updatedAt: normalizeCreatedAt(entry?.updatedAt || entry?.createdAt),
    accentColor:
      entry?.accentColor &&
      typeof entry.accentColor === "object" &&
      typeof entry.accentColor.bg === "string"
        ? entry.accentColor
        : assignAccentColor(),
    theme: typeof entry?.theme === "string" && entry.theme ? entry.theme : "neutral",
    tags: Array.isArray(entry?.tags) ? entry.tags.map(normalizeTag).filter(Boolean).slice(0, 8) : [],
    favorite: Boolean(entry?.favorite),
    pinned: Boolean(entry?.pinned),
    collection: normalizeCollection(entry?.collection),
    checklist: sanitizeChecklist(entry?.checklist, body),
    promptId: typeof entry?.promptId === "string" ? entry.promptId : "",
    templateId: typeof entry?.templateId === "string" ? entry.templateId : "",
    relatedEntryIds: Array.isArray(entry?.relatedEntryIds)
      ? entry.relatedEntryIds.filter((value) => typeof value === "string").slice(0, 8)
      : [],
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

const getHostDataFilePath = () => {
  return `${process.cwd()}/${HOST_DATA_DIR}/${HOST_DATA_FILE}`;
};

const ensureHostStore = async () => {
  await fs.mkdir(`${process.cwd()}/${HOST_DATA_DIR}`, { recursive: true });

  try {
    await fs.access(getHostDataFilePath());
  } catch (_error) {
    await fs.writeFile(getHostDataFilePath(), "[]\n", "utf8");
  }
};

export const getHostEntries = async () => {
  await ensureHostStore();

  try {
    const value = await fs.readFile(getHostDataFilePath(), "utf8");
    return parseEntries(value)
      .map(sanitizeEntry)
      .filter(Boolean)
      .sort((left, right) => {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  } catch (_error) {
    return [];
  }
};

export const writeHostEntries = async (entries) => {
  const sanitizedEntries = entries
    .map(sanitizeEntry)
    .filter(Boolean)
    .sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

  await ensureHostStore();
  await fs.writeFile(getHostDataFilePath(), `${JSON.stringify(sanitizedEntries, null, 2)}\n`, "utf8");
  return sanitizedEntries;
};

export const getHostEntryById = async (id) => {
  const entries = await getHostEntries();
  return entries.find((entry) => entry.id === id) || null;
};

export const createHostEntry = async (payload) => {
  const now = new Date().toISOString();
  const entry = sanitizeEntry({
    id: generateId(),
    ...payload,
    createdAt: now,
    updatedAt: now,
    accentColor: assignAccentColor(),
    theme: "neutral",
  });
  const entries = [entry, ...(await getHostEntries())];
  await writeHostEntries(entries);
  return entry;
};

export const updateHostEntry = async (id, updates) => {
  const entries = await getHostEntries();
  const currentEntry = entries.find((entry) => entry.id === id);

  if (!currentEntry) {
    return null;
  }

  const nextEntry = sanitizeEntry({
    ...currentEntry,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  const nextEntries = entries.map((entry) => {
    return entry.id === id ? nextEntry : entry;
  });

  await writeHostEntries(nextEntries);
  return nextEntry;
};

export const deleteHostEntry = async (id) => {
  const nextEntries = (await getHostEntries()).filter((entry) => entry.id !== id);
  await writeHostEntries(nextEntries);
  return nextEntries;
};

export const importHostEntries = async (importedEntries, options = {}) => {
  const currentEntries = await getHostEntries();
  const entriesById = new Map(
    (options.replaceAll ? [] : currentEntries).map((entry) => [entry.id, entry])
  );
  let importedCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  importedEntries.forEach((entry) => {
    const sanitizedEntry = sanitizeEntry(entry);

    if (!sanitizedEntry) {
      invalidCount += 1;
      return;
    }

    if (entriesById.has(sanitizedEntry.id)) {
      duplicateCount += 1;

      if (options.duplicateMode === "keep-existing") {
        return;
      }
    }

    entriesById.set(sanitizedEntry.id, sanitizedEntry);
    importedCount += 1;
  });

  const nextEntries = await writeHostEntries(Array.from(entriesById.values()));

  return {
    entries: nextEntries,
    importedCount,
    duplicateCount,
    invalidCount,
  };
};

export default {
  getHostEntries,
  writeHostEntries,
  getHostEntryById,
  createHostEntry,
  updateHostEntry,
  deleteHostEntry,
  importHostEntries,
};
