import {
  extractChecklistItems,
  normalizeCollection,
  normalizeDraft,
  normalizeTag,
  prepareImportPreview,
} from "./journal.mjs";
import { assignAccentColor, generateId } from "./utils";

const STORAGE_KEY = "lumen_entries";
const UI_MODE_KEY = "lumen_ui_mode";
const PREVIEW_MODE_KEY = "lumen_preview_mode";
const DRAFT_KEY_PREFIX = "lumen_draft_";
const PRIVACY_KEY = "lumen_privacy";
const LAST_EXPORT_KEY = "lumen_last_export";
const DB_NAME = "lumen-journal-db";
const DB_VERSION = 1;
const ENTRY_STORE = "entries";
const META_STORE = "meta";

const isBrowser = () => typeof window !== "undefined";

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

let databasePromise = null;

const requestToPromise = (request) => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const openDatabase = async () => {
  if (!isBrowser() || typeof window.indexedDB === "undefined") {
    return null;
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(ENTRY_STORE)) {
          database.createObjectStore(ENTRY_STORE, { keyPath: "id" });
        }

        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return databasePromise;
};

const runTransaction = async (storeNames, mode, callback) => {
  const database = await openDatabase();

  if (!database) {
    return callback(null);
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, mode);
    const stores = Array.isArray(storeNames)
      ? storeNames.map((name) => transaction.objectStore(name))
      : transaction.objectStore(storeNames);

    let result;

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

    Promise.resolve(callback(stores))
      .then((value) => {
        result = value;
      })
      .catch((error) => {
        transaction.abort();
        reject(error);
      });
  });
};

const putMeta = async (key, value) => {
  return runTransaction(META_STORE, "readwrite", (store) => {
    store.put({ key, value });
  });
};

const getMeta = async (key) => {
  const database = await openDatabase();

  if (!database) {
    return null;
  }

  return runTransaction(META_STORE, "readonly", async (store) => {
    const record = await requestToPromise(store.get(key));
    return record?.value ?? null;
  });
};

const getLegacyEntries = () => {
  if (!isBrowser()) {
    return [];
  }

  return parseEntries(window.localStorage.getItem(STORAGE_KEY))
    .map(sanitizeEntry)
    .filter(Boolean);
};

const ensureMigrated = async () => {
  if (!isBrowser()) {
    return;
  }

  const database = await openDatabase();

  if (!database) {
    return;
  }

  const alreadyMigrated = await getMeta("entries-migrated");

  if (alreadyMigrated) {
    return;
  }

  const existingEntries = await runTransaction(ENTRY_STORE, "readonly", (store) => {
    return requestToPromise(store.getAll());
  });

  if (existingEntries.length === 0) {
    const legacyEntries = getLegacyEntries();

    if (legacyEntries.length > 0) {
      await runTransaction(ENTRY_STORE, "readwrite", (store) => {
        legacyEntries.forEach((entry) => {
          store.put(entry);
        });
      });
    }
  }

  await putMeta("entries-migrated", true);
};

const getEntriesFromIndexedDb = async () => {
  await ensureMigrated();

  const database = await openDatabase();

  if (!database) {
    return getLegacyEntries();
  }

  const entries = await runTransaction(ENTRY_STORE, "readonly", (store) => {
    return requestToPromise(store.getAll());
  });

  return entries
    .map(sanitizeEntry)
    .filter(Boolean)
    .sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
};

const writeEntriesToIndexedDb = async (entries) => {
  const sanitizedEntries = entries.map(sanitizeEntry).filter(Boolean);
  const database = await openDatabase();

  if (!database) {
    if (isBrowser()) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedEntries));
    }

    return sanitizedEntries;
  }

  await runTransaction(ENTRY_STORE, "readwrite", async (store) => {
    await requestToPromise(store.clear());
    sanitizedEntries.forEach((entry) => {
      store.put(entry);
    });
  });

  return sanitizedEntries;
};

const arrayBufferToBase64 = (value) => {
  return window.btoa(String.fromCharCode(...new Uint8Array(value)));
};

const base64ToUint8Array = (value) => {
  return Uint8Array.from(window.atob(value), (character) => character.charCodeAt(0));
};

const deriveEncryptionKey = async (passphrase, salt) => {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

const encryptPayload = async (payload, passphrase) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveEncryptionKey(passphrase, salt);
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(payload)
  );

  return {
    version: 1,
    algorithm: "AES-GCM",
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
    ciphertext: arrayBufferToBase64(cipherBuffer),
  };
};

const decryptPayload = async (payload, passphrase) => {
  const key = await deriveEncryptionKey(passphrase, base64ToUint8Array(payload.salt));
  const plainBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToUint8Array(payload.iv),
    },
    key,
    base64ToUint8Array(payload.ciphertext)
  );

  return new TextDecoder().decode(plainBuffer);
};

const sha256 = async (value) => {
  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );

  return arrayBufferToBase64(digest);
};

export const getEntries = async () => {
  return getEntriesFromIndexedDb();
};

export const getEntryById = async (id) => {
  const entries = await getEntries();
  return entries.find((entry) => entry.id === id) || null;
};

export const saveEntries = async (entries) => {
  return writeEntriesToIndexedDb(entries);
};

export const createEntry = async ({
  title,
  body,
  tags,
  collection,
  favorite,
  pinned,
  templateId,
  promptId,
  relatedEntryIds,
}) => {
  const now = new Date().toISOString();
  const entry = sanitizeEntry({
    id: generateId(),
    title,
    body,
    createdAt: now,
    updatedAt: now,
    accentColor: assignAccentColor(),
    theme: "neutral",
    tags,
    collection,
    favorite,
    pinned,
    templateId,
    promptId,
    relatedEntryIds,
  });
  const entries = [entry, ...(await getEntries())];
  await saveEntries(entries);
  return entry;
};

export const updateEntry = async (id, updates) => {
  const entries = await getEntries();
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

  await saveEntries(nextEntries);
  return nextEntry;
};

export const deleteEntry = async (id) => {
  const nextEntries = (await getEntries()).filter((entry) => entry.id !== id);
  await saveEntries(nextEntries);
  return nextEntries;
};

export const duplicateEntry = async (id) => {
  const currentEntry = await getEntryById(id);

  if (!currentEntry) {
    return null;
  }

  return createEntry({
    title: `${currentEntry.title} Copy`,
    body: currentEntry.body,
    tags: currentEntry.tags,
    collection: currentEntry.collection,
    favorite: false,
    pinned: false,
    templateId: currentEntry.templateId,
    promptId: currentEntry.promptId,
    relatedEntryIds: [currentEntry.id, ...(currentEntry.relatedEntryIds || [])].slice(0, 8),
  });
};

export const previewImportEntries = async (payload, passphrase = "") => {
  let importedEntries = payload;

  if (!Array.isArray(importedEntries) && importedEntries?.ciphertext) {
    if (!passphrase) {
      return {
        requiresPassphrase: true,
        preview: null,
        entries: null,
      };
    }

    const decrypted = await decryptPayload(importedEntries, passphrase);
    importedEntries = JSON.parse(decrypted);
  }

  if (!Array.isArray(importedEntries)) {
    return {
      requiresPassphrase: false,
      preview: prepareImportPreview(await getEntries(), []),
      entries: [],
    };
  }

  return {
    requiresPassphrase: false,
    preview: prepareImportPreview(await getEntries(), importedEntries),
    entries: importedEntries,
  };
};

export const importEntries = async (importedEntries, options = {}) => {
  const currentEntries = await getEntries();
  const entriesById = new Map(currentEntries.map((entry) => [entry.id, entry]));
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

  const nextEntries = await saveEntries(Array.from(entriesById.values()));

  return {
    entries: nextEntries,
    importedCount,
    duplicateCount,
    invalidCount,
  };
};

export const exportEntries = async ({ encrypted = false, passphrase = "" } = {}) => {
  const entries = await getEntries();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const payload = JSON.stringify(entries, null, 2);
  let fileContent = payload;
  let fileName = `lumen_export_${timestamp}.json`;

  if (encrypted) {
    const envelope = await encryptPayload(payload, passphrase);
    fileContent = JSON.stringify(
      {
        ...envelope,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
    fileName = `lumen_export_${timestamp}_encrypted.json`;
  }

  if (isBrowser()) {
    window.localStorage.setItem(
      LAST_EXPORT_KEY,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        count: entries.length,
        encrypted,
      })
    );
  }

  return {
    entries,
    fileName,
    blob: new Blob([fileContent], { type: "application/json" }),
  };
};

export const getLastExportMeta = () => {
  if (!isBrowser()) {
    return null;
  }

  try {
    return JSON.parse(window.localStorage.getItem(LAST_EXPORT_KEY));
  } catch (_error) {
    return null;
  }
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
    return normalizeDraft(JSON.parse(draft));
  } catch (_error) {
    return null;
  }
};

export const saveDraft = (draftId, draft) => {
  if (!isBrowser()) {
    return null;
  }

  const nextDraft = normalizeDraft(draft);
  window.localStorage.setItem(`${DRAFT_KEY_PREFIX}${draftId}`, JSON.stringify(nextDraft));
  return nextDraft;
};

export const clearDraft = (draftId) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(`${DRAFT_KEY_PREFIX}${draftId}`);
};

export const getPrivacySettings = () => {
  if (!isBrowser()) {
    return {
      passcodeHash: "",
      passcodeHint: "",
      blurOnBackground: true,
      requireUnlock: false,
    };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(PRIVACY_KEY));
    return {
      passcodeHash: typeof parsed?.passcodeHash === "string" ? parsed.passcodeHash : "",
      passcodeHint: typeof parsed?.passcodeHint === "string" ? parsed.passcodeHint : "",
      blurOnBackground: parsed?.blurOnBackground !== false,
      requireUnlock: Boolean(parsed?.passcodeHash),
    };
  } catch (_error) {
    return {
      passcodeHash: "",
      passcodeHint: "",
      blurOnBackground: true,
      requireUnlock: false,
    };
  }
};

export const savePrivacySettings = async ({ passcode, passcodeHint, blurOnBackground }) => {
  if (!isBrowser()) {
    return getPrivacySettings();
  }

  const nextSettings = {
    passcodeHash: passcode ? await sha256(passcode) : "",
    passcodeHint: typeof passcodeHint === "string" ? passcodeHint.slice(0, 60) : "",
    blurOnBackground: blurOnBackground !== false,
  };

  window.localStorage.setItem(PRIVACY_KEY, JSON.stringify(nextSettings));
  return {
    ...nextSettings,
    requireUnlock: Boolean(nextSettings.passcodeHash),
  };
};

export const verifyPasscode = async (passcode) => {
  const settings = getPrivacySettings();

  if (!settings.passcodeHash) {
    return true;
  }

  return (await sha256(passcode)) === settings.passcodeHash;
};

export default {
  getEntries,
  getEntryById,
  saveEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  duplicateEntry,
  previewImportEntries,
  importEntries,
  exportEntries,
  getLastExportMeta,
  getUiMode,
  saveUiMode,
  getPreviewMode,
  savePreviewMode,
  getDraft,
  saveDraft,
  clearDraft,
  getPrivacySettings,
  savePrivacySettings,
  verifyPasscode,
};
